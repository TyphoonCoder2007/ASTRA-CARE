from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
import uuid
import json
import random
import numpy as np
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from passlib.context import CryptContext
import jwt

load_dotenv()

app = FastAPI(title="ASTRA-CARE Web API", version="2.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/astracare")
client = AsyncIOMotorClient(MONGO_URL)
db = client.astracare

# Collections
users_col = db.users
health_data_col = db.health_data
baselines_col = db.baselines
alerts_col = db.alerts
chat_history_col = db.chat_history
mission_context_col = db.mission_context
facial_analysis_col = db.facial_analysis
sessions_col = db.sessions

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET", "astra-care-super-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# ===================== AUTH MODELS =====================

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "astronaut"  # astronaut | supervisor | medical
    astronaut_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

# ===================== AUTH FUNCTIONS =====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await users_col.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===================== AUTH ENDPOINTS =====================

@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    existing = await users_col.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    astronaut_id = user_data.astronaut_id or f"AST-{str(uuid.uuid4())[:4].upper()}"
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role,
        "astronaut_id": astronaut_id,
        "avatar_url": None,
        "created_at": datetime.utcnow(),
        "last_login": None
    }
    
    await users_col.insert_one(user)
    
    # Create initial context
    await mission_context_col.insert_one({
        "astronaut_id": astronaut_id,
        "mission_phase": "transit",
        "time_of_day": "morning",
        "work_cycle": "active",
        "days_since_launch": 1,
        "current_workload": "moderate",
        "updated_at": datetime.utcnow()
    })
    
    token = create_access_token({"sub": user_id})
    user.pop("_id", None)
    user.pop("password", None)
    
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = await users_col.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await users_col.update_one({"id": user["id"]}, {"$set": {"last_login": datetime.utcnow()}})
    
    token = create_access_token({"sub": user["id"]})
    user.pop("_id", None)
    user.pop("password", None)
    
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.put("/api/auth/profile")
async def update_profile(updates: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    allowed_fields = ["full_name", "avatar_url"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await users_col.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    updated_user = await users_col.find_one({"id": current_user["id"]})
    updated_user.pop("_id", None)
    updated_user.pop("password", None)
    return updated_user

# ===================== HEALTH DATA MODELS =====================

class HealthDataInput(BaseModel):
    astronaut_id: str
    heart_rate: float
    hrv: float
    stress_level: float
    fatigue_level: float
    timestamp: Optional[datetime] = None
    confidence: float = 0.9
    source: str = "manual"

class FacialAnalysisInput(BaseModel):
    astronaut_id: str
    estimated_hr: Optional[float] = None
    respiration_rate: Optional[float] = None
    hrv_trend: Optional[float] = None
    oxygen_saturation_trend: Optional[float] = None
    blood_pressure_trend: Optional[str] = None
    mood_state: Optional[str] = None
    mental_stress_index: Optional[float] = None
    fatigue_probability: Optional[float] = None
    alertness_level: Optional[float] = None
    facial_tension: Optional[float] = None
    pain_likelihood: Optional[float] = None
    blink_rate: Optional[float] = None
    eye_openness: Optional[float] = None
    skin_hydration_indicator: Optional[str] = None
    dehydration_risk: Optional[float] = None
    confidence_scores: Optional[Dict[str, float]] = None
    timestamp: Optional[datetime] = None

class MissionContextInput(BaseModel):
    astronaut_id: str
    mission_phase: str
    time_of_day: str
    work_cycle: str
    days_since_launch: int
    current_workload: str

class ChatMessageInput(BaseModel):
    astronaut_id: str
    message: str
    session_id: Optional[str] = None

class AlertAcknowledgment(BaseModel):
    alert_id: str
    astronaut_id: str
    action: str

# ===================== VALIDATION FUNCTIONS =====================

def validate_health_data(data: HealthDataInput) -> Dict[str, Any]:
    issues = []
    confidence_score = data.confidence
    
    if not (40 <= data.heart_rate <= 200):
        issues.append("Heart rate out of normal range")
        confidence_score *= 0.7
    
    if not (0 <= data.hrv <= 200):
        issues.append("HRV out of expected range")
        confidence_score *= 0.8
    
    if not (0 <= data.stress_level <= 100):
        issues.append("Stress level should be 0-100")
        confidence_score *= 0.8
    
    if not (0 <= data.fatigue_level <= 100):
        issues.append("Fatigue level should be 0-100")
        confidence_score *= 0.8
    
    return {
        "is_valid": len(issues) == 0,
        "issues": issues,
        "adjusted_confidence": confidence_score,
        "data_freshness": "current" if data.timestamp else "unknown"
    }

# ===================== HEALTH ENDPOINTS =====================

@app.post("/api/health/ingest")
async def ingest_health_data(data: HealthDataInput):
    validation = validate_health_data(data)
    
    record = {
        "id": str(uuid.uuid4()),
        "astronaut_id": data.astronaut_id,
        "heart_rate": data.heart_rate,
        "hrv": data.hrv,
        "stress_level": data.stress_level,
        "fatigue_level": data.fatigue_level,
        "timestamp": data.timestamp or datetime.utcnow(),
        "confidence": validation["adjusted_confidence"],
        "source": data.source,
        "validation": validation,
        "created_at": datetime.utcnow()
    }
    
    await health_data_col.insert_one(record)
    risk_analysis = await analyze_health_risk(data.astronaut_id, record)
    
    return {
        "success": True,
        "record_id": record["id"],
        "validation": validation,
        "risk_analysis": risk_analysis
    }

@app.get("/api/health/latest/{astronaut_id}")
async def get_latest_health(astronaut_id: str):
    record = await health_data_col.find_one(
        {"astronaut_id": astronaut_id},
        sort=[("timestamp", -1)]
    )
    if record:
        record.pop("_id", None)
        return record
    return None

@app.get("/api/health/timeline/{astronaut_id}")
async def get_health_timeline(astronaut_id: str, days: int = 7):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = await health_data_col.find({
        "astronaut_id": astronaut_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1).to_list(1000)
    
    for r in records:
        r.pop("_id", None)
    
    daily_data = {}
    for r in records:
        day = r["timestamp"].strftime("%Y-%m-%d")
        if day not in daily_data:
            daily_data[day] = {"hr": [], "hrv": [], "stress": [], "fatigue": []}
        daily_data[day]["hr"].append(r["heart_rate"])
        daily_data[day]["hrv"].append(r["hrv"])
        daily_data[day]["stress"].append(r["stress_level"])
        daily_data[day]["fatigue"].append(r["fatigue_level"])
    
    daily_averages = []
    for day, values in sorted(daily_data.items()):
        daily_averages.append({
            "date": day,
            "avg_hr": round(np.mean(values["hr"]), 1),
            "avg_hrv": round(np.mean(values["hrv"]), 1),
            "avg_stress": round(np.mean(values["stress"]), 1),
            "avg_fatigue": round(np.mean(values["fatigue"]), 1)
        })
    
    return {
        "records": records,
        "daily_averages": daily_averages,
        "total_records": len(records)
    }

# ===================== FACIAL ANALYSIS ENDPOINTS =====================

@app.post("/api/facial/analyze")
async def store_facial_analysis(data: FacialAnalysisInput):
    record = {
        "id": str(uuid.uuid4()),
        "astronaut_id": data.astronaut_id,
        "timestamp": data.timestamp or datetime.utcnow(),
        "vital_estimates": {
            "heart_rate": data.estimated_hr,
            "respiration_rate": data.respiration_rate,
            "hrv_trend": data.hrv_trend,
            "oxygen_saturation_trend": data.oxygen_saturation_trend,
            "blood_pressure_trend": data.blood_pressure_trend
        },
        "mental_indicators": {
            "mood_state": data.mood_state,
            "mental_stress_index": data.mental_stress_index,
            "fatigue_probability": data.fatigue_probability,
            "alertness_level": data.alertness_level,
            "facial_tension": data.facial_tension,
            "pain_likelihood": data.pain_likelihood
        },
        "physical_indicators": {
            "blink_rate": data.blink_rate,
            "eye_openness": data.eye_openness,
            "skin_hydration": data.skin_hydration_indicator,
            "dehydration_risk": data.dehydration_risk
        },
        "confidence_scores": data.confidence_scores or {},
        "disclaimer": "All outputs are estimations, not medical diagnoses",
        "created_at": datetime.utcnow()
    }
    
    await facial_analysis_col.insert_one(record)
    
    # Also ingest as health data for dashboard integration
    if data.estimated_hr and data.mental_stress_index:
        health_record = {
            "id": str(uuid.uuid4()),
            "astronaut_id": data.astronaut_id,
            "heart_rate": data.estimated_hr,
            "hrv": data.hrv_trend or 50,
            "stress_level": data.mental_stress_index,
            "fatigue_level": data.fatigue_probability or 30,
            "timestamp": datetime.utcnow(),
            "confidence": data.confidence_scores.get("overall", 0.75) if data.confidence_scores else 0.75,
            "source": "facial_scan",
            "validation": {"is_valid": True, "issues": [], "adjusted_confidence": 0.75},
            "created_at": datetime.utcnow()
        }
        await health_data_col.insert_one(health_record)
    
    return {
        "success": True,
        "record_id": record["id"],
        "analysis_summary": {
            "mood": data.mood_state,
            "stress_index": data.mental_stress_index,
            "fatigue": data.fatigue_probability,
            "alertness": data.alertness_level,
            "heart_rate": data.estimated_hr
        },
        "integrated_to_dashboard": True
    }

@app.get("/api/facial/history/{astronaut_id}")
async def get_facial_history(astronaut_id: str, limit: int = 50):
    records = await facial_analysis_col.find(
        {"astronaut_id": astronaut_id}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for r in records:
        r.pop("_id", None)
    
    return {"records": records}

@app.get("/api/facial/latest/{astronaut_id}")
async def get_latest_facial(astronaut_id: str):
    record = await facial_analysis_col.find_one(
        {"astronaut_id": astronaut_id},
        sort=[("timestamp", -1)]
    )
    if record:
        record.pop("_id", None)
        return record
    return None

# ===================== BASELINE ENDPOINTS =====================

async def calculate_baseline(astronaut_id: str) -> Dict[str, Any]:
    week_ago = datetime.utcnow() - timedelta(days=7)
    records = await health_data_col.find({
        "astronaut_id": astronaut_id,
        "timestamp": {"$gte": week_ago}
    }).to_list(1000)
    
    if len(records) < 5:
        return {
            "hr_baseline": 70,
            "hr_std": 10,
            "hrv_baseline": 50,
            "hrv_std": 15,
            "stress_baseline": 30,
            "fatigue_baseline": 25,
            "data_points": len(records),
            "is_default": True
        }
    
    hr_values = [r["heart_rate"] for r in records]
    hrv_values = [r["hrv"] for r in records]
    stress_values = [r["stress_level"] for r in records]
    fatigue_values = [r["fatigue_level"] for r in records]
    
    return {
        "hr_baseline": float(np.mean(hr_values)),
        "hr_std": float(np.std(hr_values)),
        "hrv_baseline": float(np.mean(hrv_values)),
        "hrv_std": float(np.std(hrv_values)),
        "stress_baseline": float(np.mean(stress_values)),
        "fatigue_baseline": float(np.mean(fatigue_values)),
        "data_points": len(records),
        "is_default": False
    }

@app.get("/api/baseline/{astronaut_id}")
async def get_baseline(astronaut_id: str):
    baseline = await baselines_col.find_one({"astronaut_id": astronaut_id})
    
    if not baseline:
        baseline = await calculate_baseline(astronaut_id)
        baseline["astronaut_id"] = astronaut_id
        baseline["id"] = str(uuid.uuid4())
        baseline["updated_at"] = datetime.utcnow()
        await baselines_col.insert_one(baseline)
    
    baseline.pop("_id", None)
    return baseline

@app.post("/api/baseline/recalibrate")
async def recalibrate_baseline(astronaut_id: str):
    new_baseline = await calculate_baseline(astronaut_id)
    new_baseline["astronaut_id"] = astronaut_id
    new_baseline["id"] = str(uuid.uuid4())
    new_baseline["updated_at"] = datetime.utcnow()
    
    await baselines_col.update_one(
        {"astronaut_id": astronaut_id},
        {"$set": new_baseline},
        upsert=True
    )
    
    new_baseline.pop("_id", None)
    return {"success": True, "baseline": new_baseline}

# ===================== RISK ANALYSIS =====================

async def analyze_health_risk(astronaut_id: str, current_data: Dict) -> Dict[str, Any]:
    baseline = await get_baseline(astronaut_id)
    context = await get_current_context(astronaut_id)
    
    risk_factors = []
    risk_level = 0
    
    hr_deviation = abs(current_data["heart_rate"] - baseline["hr_baseline"]) / max(baseline["hr_std"], 1)
    if hr_deviation > 2:
        risk_factors.append({
            "factor": "heart_rate_deviation",
            "severity": "moderate" if hr_deviation < 3 else "high",
            "message": f"Heart rate significantly deviates from personal baseline",
            "deviation_sigma": round(hr_deviation, 2)
        })
        risk_level += 20 if hr_deviation < 3 else 35
    
    if current_data["stress_level"] > 70:
        risk_factors.append({
            "factor": "high_stress",
            "severity": "moderate" if current_data["stress_level"] < 85 else "high",
            "message": "Elevated stress levels detected",
            "value": current_data["stress_level"]
        })
        risk_level += 20 if current_data["stress_level"] < 85 else 30
    
    if current_data["fatigue_level"] > 65:
        risk_factors.append({
            "factor": "high_fatigue",
            "severity": "moderate" if current_data["fatigue_level"] < 80 else "high",
            "message": "Significant fatigue indicators present",
            "value": current_data["fatigue_level"]
        })
        risk_level += 15 if current_data["fatigue_level"] < 80 else 25
    
    if context and context.get("mission_phase") in ["eva", "high-load"]:
        risk_level = int(risk_level * 0.8)
    
    escalation_level = 0
    if risk_level >= 30:
        escalation_level = 1
    if risk_level >= 55:
        escalation_level = 2
    if risk_level >= 80:
        escalation_level = 3
    
    return {
        "risk_level": min(risk_level, 100),
        "risk_factors": risk_factors,
        "escalation_level": escalation_level,
        "recommendations": get_recommendations(escalation_level, risk_factors)
    }

def get_recommendations(level: int, factors: List[Dict]) -> List[str]:
    if level == 0:
        return ["All indicators within normal range. Continue monitoring."]
    
    recommendations = []
    
    if level >= 1:
        recommendations.extend([
            "Consider a brief breathing exercise (4-7-8 technique)",
            "Take a moment for grounding - notice 5 things you can see"
        ])
    
    if level >= 2:
        recommendations.extend([
            "Recommend scheduling a rest period within next 2 hours",
            "Consider workload moderation if mission-critical tasks allow"
        ])
    
    if level >= 3:
        recommendations.extend([
            "Flag for local medical review consideration",
            "Contact mission control at earliest communication window"
        ])
    
    return recommendations[:4]

# ===================== MISSION CONTEXT =====================

async def get_current_context(astronaut_id: str) -> Optional[Dict]:
    context = await mission_context_col.find_one({"astronaut_id": astronaut_id})
    if context:
        context.pop("_id", None)
    return context

@app.post("/api/context/update")
async def update_mission_context(data: MissionContextInput):
    context = {
        "id": str(uuid.uuid4()),
        "astronaut_id": data.astronaut_id,
        "mission_phase": data.mission_phase,
        "time_of_day": data.time_of_day,
        "work_cycle": data.work_cycle,
        "days_since_launch": data.days_since_launch,
        "current_workload": data.current_workload,
        "updated_at": datetime.utcnow()
    }
    
    await mission_context_col.update_one(
        {"astronaut_id": data.astronaut_id},
        {"$set": context},
        upsert=True
    )
    
    return {"success": True, "context": context}

@app.get("/api/context/{astronaut_id}")
async def get_context(astronaut_id: str):
    context = await get_current_context(astronaut_id)
    if not context:
        return {
            "astronaut_id": astronaut_id,
            "mission_phase": "transit",
            "time_of_day": "morning",
            "work_cycle": "active",
            "days_since_launch": 1,
            "current_workload": "moderate"
        }
    return context

# ===================== ALERTS =====================

@app.get("/api/alerts/{astronaut_id}")
async def get_alerts(astronaut_id: str, status: str = "active"):
    query = {"astronaut_id": astronaut_id}
    if status != "all":
        query["status"] = status
    
    alerts = await alerts_col.find(query).sort("created_at", -1).limit(50).to_list(50)
    for a in alerts:
        a.pop("_id", None)
    
    return {"alerts": alerts}

@app.post("/api/alerts/acknowledge")
async def acknowledge_alert(data: AlertAcknowledgment):
    update_data = {
        "status": data.action,
        "acknowledged_at": datetime.utcnow(),
        "acknowledged_by": data.astronaut_id
    }
    
    result = await alerts_col.update_one(
        {"id": data.alert_id},
        {"$set": update_data}
    )
    
    return {"success": result.modified_count > 0}

# ===================== PSYCHOLOGICAL SUPPORT CHAT =====================

PSYCH_SYSTEM_PROMPT = """You are ASTRA, the psychological support companion for astronauts on long-duration space missions. You are designed by top aerospace psychologists and AI specialists.

Your Core Traits:
- Warm, empathetic, and genuinely caring
- Professional yet approachable
- Knowledgeable about space psychology and human performance
- Calm and reassuring, especially during stress

Your Capabilities:
1. STRESS MANAGEMENT: Guide breathing exercises, progressive muscle relaxation, and grounding techniques
2. FOCUS & PERFORMANCE: Help with concentration, task prioritization, and mental clarity
3. MOTIVATION & RESILIENCE: Provide encouragement, remind of training and purpose, help reframe challenges
4. SLEEP & RECOVERY: Offer sleep hygiene tips, relaxation routines, and circadian rhythm guidance
5. INTERPERSONAL: Help navigate crew dynamics and communication challenges
6. HOMESICKNESS & ISOLATION: Provide coping strategies for separation from loved ones

Guidelines:
- Keep responses concise but meaningful (2-4 sentences typically, unless detailed guidance is requested)
- Never provide medical diagnoses or clinical therapy
- If physical symptoms are mentioned, gently suggest logging them in the health system
- Use calming, professional language
- Acknowledge feelings without judgment
- Offer practical, actionable suggestions
- Remember you're speaking to highly trained professionals

Response Style:
- Start with acknowledgment of their state
- Provide a specific, actionable suggestion
- End with reassurance or forward-looking statement

Example responses:
- "I hear that you're feeling overwhelmed. Let's try the 4-7-8 breathing technique together - inhale for 4 counts, hold for 7, exhale for 8. This activates your parasympathetic system. You've handled pressure before, and you'll handle this too."
- "Pre-EVA nerves are completely normal - your body is preparing for peak performance. Channel that energy: visualize yourself completing each step successfully. You've trained for this moment."
"""

@app.post("/api/chat/send")
async def send_chat_message(data: ChatMessageInput):
    session_id = data.session_id or f"{data.astronaut_id}-{datetime.utcnow().strftime('%Y%m%d')}"
    
    # Get recent chat history for context
    history = await chat_history_col.find({
        "session_id": session_id
    }).sort("timestamp", 1).limit(20).to_list(20)
    
    context_messages = []
    for h in history[-6:]:
        context_messages.append(f"Astronaut: {h['user_message']}")
        context_messages.append(f"ASTRA: {h['assistant_response']}")
    
    # Get current health context
    latest_health = await get_latest_health(data.astronaut_id)
    health_context = ""
    if latest_health:
        health_context = f"\n\nCurrent Health Context: HR={latest_health.get('heart_rate', 'N/A')} BPM, Stress={latest_health.get('stress_level', 'N/A')}%, Fatigue={latest_health.get('fatigue_level', 'N/A')}%"
    
    full_system = PSYCH_SYSTEM_PROMPT + health_context
    if context_messages:
        full_system += "\n\nRecent conversation:\n" + "\n".join(context_messages)
    
    # Initialize LLM chat
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=full_system
    ).with_model("openai", "gpt-4o")
    
    user_message = UserMessage(text=data.message)
    response = await chat.send_message(user_message)
    
    chat_record = {
        "id": str(uuid.uuid4()),
        "astronaut_id": data.astronaut_id,
        "session_id": session_id,
        "user_message": data.message,
        "assistant_response": response,
        "timestamp": datetime.utcnow()
    }
    await chat_history_col.insert_one(chat_record)
    
    return {
        "response": response,
        "session_id": session_id,
        "message_id": chat_record["id"]
    }

@app.get("/api/chat/history/{astronaut_id}")
async def get_chat_history(astronaut_id: str, session_id: Optional[str] = None, limit: int = 50):
    query = {"astronaut_id": astronaut_id}
    if session_id:
        query["session_id"] = session_id
    
    history = await chat_history_col.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    for h in history:
        h.pop("_id", None)
    
    return {"history": list(reversed(history))}

# ===================== SIMULATION & DEMO =====================

@app.post("/api/simulate/generate")
async def generate_simulation_data(astronaut_id: str, days: int = 7):
    records_created = 0
    
    for day_offset in range(days, 0, -1):
        base_date = datetime.utcnow() - timedelta(days=day_offset)
        num_readings = random.randint(8, 12)
        
        for i in range(num_readings):
            hour = 6 + (i * 2)
            timestamp = base_date.replace(hour=min(hour, 22), minute=random.randint(0, 59))
            
            base_hr = 68 + random.gauss(0, 8)
            base_stress = 25 + random.gauss(0, 12) + (day_offset * 1.5)
            
            data = HealthDataInput(
                astronaut_id=astronaut_id,
                heart_rate=max(50, min(120, base_hr + random.gauss(0, 5))),
                hrv=max(20, min(100, 55 + random.gauss(0, 15))),
                stress_level=max(0, min(100, base_stress)),
                fatigue_level=max(0, min(100, 20 + random.gauss(0, 15) + (hour - 6) * 2)),
                timestamp=timestamp,
                confidence=0.85 + random.random() * 0.15,
                source="simulation"
            )
            
            await ingest_health_data(data)
            records_created += 1
    
    return {"success": True, "records_created": records_created}

# ===================== SYSTEM ENDPOINTS =====================

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "system": "ASTRA-CARE Web"
    }

@app.get("/api/astronauts")
async def get_astronauts():
    pipeline = [
        {"$group": {"_id": "$astronaut_id"}},
        {"$project": {"astronaut_id": "$_id", "_id": 0}}
    ]
    
    result = await health_data_col.aggregate(pipeline).to_list(100)
    astronauts = [r["astronaut_id"] for r in result]
    
    if not astronauts:
        astronauts = ["AST-001", "AST-002", "AST-003"]
    
    return {"astronauts": astronauts}

@app.get("/api/dashboard/summary/{astronaut_id}")
async def get_dashboard_summary(astronaut_id: str):
    """Get comprehensive dashboard data in a single call"""
    latest_health = await get_latest_health(astronaut_id)
    baseline = await get_baseline(astronaut_id)
    context = await get_current_context(astronaut_id)
    timeline = await get_health_timeline(astronaut_id, days=7)
    alerts = await get_alerts(astronaut_id)
    latest_facial = await get_latest_facial(astronaut_id)
    
    return {
        "health": latest_health,
        "baseline": baseline,
        "context": context,
        "timeline": timeline["daily_averages"],
        "alerts": alerts["alerts"],
        "facial_analysis": latest_facial,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

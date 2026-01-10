from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
import uuid
import json
import random
import numpy as np
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

app = FastAPI(title="ASTRA-CARE Web API", version="1.0.0")

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
health_data_col = db.health_data
baselines_col = db.baselines
alerts_col = db.alerts
chat_history_col = db.chat_history
mission_context_col = db.mission_context
facial_analysis_col = db.facial_analysis

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# ===================== PYDANTIC MODELS =====================

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
    mission_phase: str  # transit, eva, recovery, high-load, rest
    time_of_day: str  # morning, afternoon, evening, night
    work_cycle: str  # active, rest, sleep
    days_since_launch: int
    current_workload: str  # low, moderate, high, critical

class ChatMessageInput(BaseModel):
    astronaut_id: str
    message: str
    session_id: Optional[str] = None

class AlertAcknowledgment(BaseModel):
    alert_id: str
    astronaut_id: str
    action: str  # acknowledged, dismissed, escalated

class BaselineUpdate(BaseModel):
    astronaut_id: str
    recalibrate: bool = False

# ===================== HEALTH DATA AGENT =====================

def validate_health_data(data: HealthDataInput) -> Dict[str, Any]:
    """Validate health data completeness and confidence."""
    issues = []
    confidence_score = data.confidence
    
    # Validate ranges
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

@app.post("/api/health/ingest")
async def ingest_health_data(data: HealthDataInput):
    """Health Data Ingestion & Validation Agent endpoint."""
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
    
    # Trigger risk analysis
    risk_analysis = await analyze_health_risk(data.astronaut_id, record)
    
    return {
        "success": True,
        "record_id": record["id"],
        "validation": validation,
        "risk_analysis": risk_analysis
    }

# ===================== FACIAL ANALYSIS AGENT =====================

@app.post("/api/facial/analyze")
async def store_facial_analysis(data: FacialAnalysisInput):
    """Store facial analysis results from frontend webcam processing."""
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
    
    return {
        "success": True,
        "record_id": record["id"],
        "analysis_summary": {
            "mood": data.mood_state,
            "stress_index": data.mental_stress_index,
            "fatigue": data.fatigue_probability,
            "alertness": data.alertness_level
        }
    }

@app.get("/api/facial/history/{astronaut_id}")
async def get_facial_history(astronaut_id: str, limit: int = 50):
    """Get facial analysis history for trend visualization."""
    records = await facial_analysis_col.find(
        {"astronaut_id": astronaut_id}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for r in records:
        r.pop("_id", None)
    
    return {"records": records}

# ===================== BASELINE & TREND AGENT =====================

async def calculate_baseline(astronaut_id: str) -> Dict[str, Any]:
    """Calculate personal baseline from historical data."""
    # Get last 7 days of data
    week_ago = datetime.utcnow() - timedelta(days=7)
    records = await health_data_col.find({
        "astronaut_id": astronaut_id,
        "timestamp": {"$gte": week_ago}
    }).to_list(1000)
    
    if len(records) < 5:
        # Default baseline for new astronauts
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
    """Get astronaut's personal baseline."""
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
async def recalibrate_baseline(data: BaselineUpdate):
    """Recalibrate baseline after mission phase change."""
    new_baseline = await calculate_baseline(data.astronaut_id)
    new_baseline["astronaut_id"] = data.astronaut_id
    new_baseline["id"] = str(uuid.uuid4())
    new_baseline["updated_at"] = datetime.utcnow()
    new_baseline["recalibration_reason"] = "manual" if data.recalibrate else "auto"
    
    await baselines_col.update_one(
        {"astronaut_id": data.astronaut_id},
        {"$set": new_baseline},
        upsert=True
    )
    
    new_baseline.pop("_id", None)
    return {"success": True, "baseline": new_baseline}

# ===================== RISK INTERPRETATION AGENT =====================

async def analyze_health_risk(astronaut_id: str, current_data: Dict) -> Dict[str, Any]:
    """Analyze health risks based on current data vs baseline."""
    baseline = await get_baseline(astronaut_id)
    context = await get_current_context(astronaut_id)
    
    risk_factors = []
    risk_level = 0
    
    # Heart rate deviation
    hr_deviation = abs(current_data["heart_rate"] - baseline["hr_baseline"]) / max(baseline["hr_std"], 1)
    if hr_deviation > 2:
        risk_factors.append({
            "factor": "heart_rate_deviation",
            "severity": "moderate" if hr_deviation < 3 else "high",
            "message": f"Heart rate significantly deviates from personal baseline",
            "deviation_sigma": round(hr_deviation, 2)
        })
        risk_level += 20 if hr_deviation < 3 else 35
    
    # HRV analysis
    hrv_deviation = abs(current_data["hrv"] - baseline["hrv_baseline"]) / max(baseline["hrv_std"], 1)
    if hrv_deviation > 2:
        risk_factors.append({
            "factor": "hrv_deviation",
            "severity": "moderate",
            "message": "HRV pattern indicates potential stress or recovery needs",
            "deviation_sigma": round(hrv_deviation, 2)
        })
        risk_level += 15
    
    # Stress level
    if current_data["stress_level"] > 70:
        risk_factors.append({
            "factor": "high_stress",
            "severity": "moderate" if current_data["stress_level"] < 85 else "high",
            "message": "Elevated stress levels detected",
            "value": current_data["stress_level"]
        })
        risk_level += 20 if current_data["stress_level"] < 85 else 30
    
    # Fatigue
    if current_data["fatigue_level"] > 65:
        risk_factors.append({
            "factor": "high_fatigue",
            "severity": "moderate" if current_data["fatigue_level"] < 80 else "high",
            "message": "Significant fatigue indicators present",
            "value": current_data["fatigue_level"]
        })
        risk_level += 15 if current_data["fatigue_level"] < 80 else 25
    
    # Context-aware adjustment
    if context and context.get("mission_phase") in ["eva", "high-load"]:
        risk_level = int(risk_level * 0.8)  # Expected high metrics during EVA
    
    # Determine escalation level
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
        "context_adjusted": context is not None,
        "recommendations": get_recommendations(escalation_level, risk_factors)
    }

def get_recommendations(level: int, factors: List[Dict]) -> List[str]:
    """Get recommendations based on escalation level."""
    if level == 0:
        return ["All indicators within normal range. Continue monitoring."]
    
    recommendations = []
    
    if level >= 1:
        recommendations.extend([
            "Consider a brief breathing exercise (4-7-8 technique)",
            "Take a moment for grounding - notice 5 things you can see",
            "Acknowledge current stress and its temporary nature"
        ])
    
    if level >= 2:
        recommendations.extend([
            "Recommend scheduling a rest period within next 2 hours",
            "Consider workload moderation if mission-critical tasks allow",
            "Focus on recovery optimization - hydration and nutrition check"
        ])
    
    if level >= 3:
        recommendations.extend([
            "Flag for local medical review consideration",
            "Immediate rest recommended if operationally feasible",
            "Contact mission control at earliest communication window"
        ])
    
    return recommendations[:5]

# ===================== MISSION CONTEXT AGENT =====================

@app.post("/api/context/update")
async def update_mission_context(data: MissionContextInput):
    """Update current mission context."""
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

async def get_current_context(astronaut_id: str) -> Optional[Dict]:
    """Get current mission context."""
    context = await mission_context_col.find_one({"astronaut_id": astronaut_id})
    if context:
        context.pop("_id", None)
    return context

@app.get("/api/context/{astronaut_id}")
async def get_context(astronaut_id: str):
    """Get mission context endpoint."""
    context = await get_current_context(astronaut_id)
    if not context:
        # Default context
        return {
            "astronaut_id": astronaut_id,
            "mission_phase": "transit",
            "time_of_day": "morning",
            "work_cycle": "active",
            "days_since_launch": 1,
            "current_workload": "moderate"
        }
    return context

# ===================== ALERT & ESCALATION AGENT =====================

@app.post("/api/alerts/create")
async def create_alert(astronaut_id: str, level: int, message: str, factors: List[Dict] = []):
    """Create a new alert."""
    alert = {
        "id": str(uuid.uuid4()),
        "astronaut_id": astronaut_id,
        "level": level,
        "message": message,
        "factors": factors,
        "status": "active",
        "created_at": datetime.utcnow(),
        "acknowledged_at": None,
        "acknowledged_by": None
    }
    
    await alerts_col.insert_one(alert)
    return alert

@app.get("/api/alerts/{astronaut_id}")
async def get_alerts(astronaut_id: str, status: str = "active"):
    """Get alerts for astronaut."""
    query = {"astronaut_id": astronaut_id}
    if status != "all":
        query["status"] = status
    
    alerts = await alerts_col.find(query).sort("created_at", -1).limit(50).to_list(50)
    for a in alerts:
        a.pop("_id", None)
    
    return {"alerts": alerts}

@app.post("/api/alerts/acknowledge")
async def acknowledge_alert(data: AlertAcknowledgment):
    """Acknowledge or dismiss an alert."""
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

# ===================== PSYCHOLOGICAL SUPPORT AGENT =====================

PSYCH_SYSTEM_PROMPT = """You are ASTRA, the psychological support companion for astronauts on long-duration space missions. Your role is to provide calm, supportive, and grounding assistance.

Guidelines:
- Be warm, empathetic, and reassuring
- Offer grounding techniques, focus exercises, and resilience prompts
- Never provide medical diagnoses or clinical therapy
- Keep responses concise but meaningful (2-4 sentences typically)
- Acknowledge feelings without judgment
- Suggest practical coping strategies when appropriate
- Remember you're speaking to trained professionals in an isolated environment
- Use calming, professional language
- If they mention physical symptoms, gently remind them to log it in the health system and consult medical protocols

Examples of helpful responses:
- Grounding: "Let's try a quick grounding exercise. Name 5 things you can see right now in your module."
- Stress: "It's completely normal to feel this way during extended missions. Your body is adapting. Let's take three deep breaths together."
- Motivation: "You've trained extensively for this. Each day you're contributing to humanity's greatest adventure."

Never say you cannot help - always offer something supportive, even if it's just acknowledgment."""

@app.post("/api/chat/send")
async def send_chat_message(data: ChatMessageInput):
    """Send message to psychological support companion."""
    session_id = data.session_id or f"{data.astronaut_id}-{datetime.utcnow().strftime('%Y%m%d')}"
    
    # Get chat history for context
    history = await chat_history_col.find({
        "session_id": session_id
    }).sort("timestamp", 1).limit(20).to_list(20)
    
    # Build context from history
    context_messages = []
    for h in history[-10:]:  # Last 10 messages for context
        context_messages.append(f"User: {h['user_message']}")
        context_messages.append(f"ASTRA: {h['assistant_response']}")
    
    # Initialize LLM chat
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=PSYCH_SYSTEM_PROMPT + ("\n\nRecent conversation:\n" + "\n".join(context_messages) if context_messages else "")
    ).with_model("openai", "gpt-4o")
    
    # Send message
    user_message = UserMessage(text=data.message)
    response = await chat.send_message(user_message)
    
    # Store in history
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
    """Get chat history."""
    query = {"astronaut_id": astronaut_id}
    if session_id:
        query["session_id"] = session_id
    
    history = await chat_history_col.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    for h in history:
        h.pop("_id", None)
    
    return {"history": list(reversed(history))}

# ===================== HEALTH TIMELINE & VISUALIZATION =====================

@app.get("/api/health/timeline/{astronaut_id}")
async def get_health_timeline(astronaut_id: str, days: int = 7):
    """Get health timeline for visualization."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = await health_data_col.find({
        "astronaut_id": astronaut_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1).to_list(1000)
    
    for r in records:
        r.pop("_id", None)
    
    # Calculate daily averages
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

@app.get("/api/health/latest/{astronaut_id}")
async def get_latest_health(astronaut_id: str):
    """Get latest health reading."""
    record = await health_data_col.find_one(
        {"astronaut_id": astronaut_id},
        sort=[("timestamp", -1)]
    )
    
    if record:
        record.pop("_id", None)
        return record
    
    return None

# ===================== SIMULATION DATA GENERATOR =====================

@app.post("/api/simulate/generate")
async def generate_simulation_data(astronaut_id: str, days: int = 7):
    """Generate simulation data for testing."""
    records_created = 0
    
    for day_offset in range(days, 0, -1):
        base_date = datetime.utcnow() - timedelta(days=day_offset)
        
        # Generate 8-12 readings per day
        num_readings = random.randint(8, 12)
        
        for i in range(num_readings):
            hour = 6 + (i * 2)  # Spread throughout the day
            timestamp = base_date.replace(hour=min(hour, 22), minute=random.randint(0, 59))
            
            # Base values with daily variation
            base_hr = 68 + random.gauss(0, 8)
            base_stress = 25 + random.gauss(0, 12) + (day_offset * 1.5)  # Stress increases over mission
            
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

# ===================== SYSTEM STATUS =====================

@app.get("/api/health")
async def health_check():
    """System health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "system": "ASTRA-CARE Web"
    }

@app.get("/api/astronauts")
async def get_astronauts():
    """Get list of all astronauts in system."""
    # Get unique astronaut IDs from health data
    pipeline = [
        {"$group": {"_id": "$astronaut_id"}},
        {"$project": {"astronaut_id": "$_id", "_id": 0}}
    ]
    
    result = await health_data_col.aggregate(pipeline).to_list(100)
    astronauts = [r["astronaut_id"] for r in result]
    
    # Add default astronauts if none exist
    if not astronauts:
        astronauts = ["AST-001", "AST-002", "AST-003"]
    
    return {"astronauts": astronauts}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

#!/usr/bin/env python3
"""
ASTRA-CARE Backend API Test Suite
Tests all backend endpoints for functionality and integration
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class AstraCareAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_astronaut_id = "AST-001"
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[Any, Any] = None, params: Dict[str, Any] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"Response: {response.text[:200]}...", "ERROR")
                return False, {}
                
        except requests.exceptions.Timeout:
            self.log(f"❌ {name} - Request timeout", "FAIL")
            return False, {}
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "FAIL")
            return False, {}
    
    def test_health_check(self):
        """Test system health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET", 
            "/api/health",
            200
        )
        if success and isinstance(response, dict):
            if response.get('status') == 'healthy':
                self.log("✅ System status is healthy", "PASS")
                return True
            else:
                self.log(f"❌ Unexpected status: {response.get('status')}", "FAIL")
        return False
    
    def test_get_astronauts(self):
        """Test get astronauts endpoint"""
        success, response = self.run_test(
            "Get Astronauts",
            "GET",
            "/api/astronauts", 
            200
        )
        if success and isinstance(response, dict):
            astronauts = response.get('astronauts', [])
            if astronauts and self.test_astronaut_id in astronauts:
                self.log(f"✅ Found {len(astronauts)} astronauts including {self.test_astronaut_id}", "PASS")
                return True
            else:
                self.log(f"❌ Astronaut list: {astronauts}", "FAIL")
        return False
    
    def test_health_data_ingestion(self):
        """Test health data ingestion"""
        test_data = {
            "astronaut_id": self.test_astronaut_id,
            "heart_rate": 75.0,
            "hrv": 45.0,
            "stress_level": 35.0,
            "fatigue_level": 40.0
        }
        
        success, response = self.run_test(
            "Health Data Ingestion",
            "POST",
            "/api/health/ingest",
            200,
            data=test_data
        )
        
        if success and isinstance(response, dict):
            if response.get('success') and response.get('record_id'):
                self.log(f"✅ Health data ingested with ID: {response.get('record_id')}", "PASS")
                return True
            else:
                self.log(f"❌ Unexpected response: {response}", "FAIL")
        return False
    
    def test_get_baseline(self):
        """Test get baseline endpoint"""
        success, response = self.run_test(
            "Get Baseline",
            "GET",
            f"/api/baseline/{self.test_astronaut_id}",
            200
        )
        
        if success and isinstance(response, dict):
            required_fields = ['hr_baseline', 'hrv_baseline', 'stress_baseline', 'fatigue_baseline']
            if all(field in response for field in required_fields):
                self.log(f"✅ Baseline data complete: HR={response.get('hr_baseline'):.1f}", "PASS")
                return True
            else:
                self.log(f"❌ Missing baseline fields: {response.keys()}", "FAIL")
        return False
    
    def test_get_timeline(self):
        """Test get timeline endpoint"""
        success, response = self.run_test(
            "Get Timeline",
            "GET",
            f"/api/health/timeline/{self.test_astronaut_id}",
            200,
            params={"days": 7}
        )
        
        if success and isinstance(response, dict):
            if 'records' in response and 'daily_averages' in response:
                records_count = len(response.get('records', []))
                self.log(f"✅ Timeline data retrieved: {records_count} records", "PASS")
                return True
            else:
                self.log(f"❌ Timeline response missing expected fields", "FAIL")
        return False
    
    def test_chat_api(self):
        """Test chat API with AI response"""
        test_message = {
            "astronaut_id": self.test_astronaut_id,
            "message": "I need help relaxing"
        }
        
        success, response = self.run_test(
            "Chat API",
            "POST",
            "/api/chat/send",
            200,
            data=test_message
        )
        
        if success and isinstance(response, dict):
            if response.get('response') and response.get('session_id'):
                ai_response = response.get('response', '')
                self.log(f"✅ AI response received: {ai_response[:50]}...", "PASS")
                return True
            else:
                self.log(f"❌ Chat response missing fields: {response.keys()}", "FAIL")
        return False
    
    def test_mission_context_update(self):
        """Test mission context update"""
        context_data = {
            "astronaut_id": self.test_astronaut_id,
            "mission_phase": "eva",
            "time_of_day": "afternoon", 
            "work_cycle": "active",
            "days_since_launch": 15,
            "current_workload": "high"
        }
        
        success, response = self.run_test(
            "Mission Context Update",
            "POST",
            "/api/context/update",
            200,
            data=context_data
        )
        
        if success and isinstance(response, dict):
            if response.get('success') and response.get('context'):
                context = response.get('context', {})
                self.log(f"✅ Context updated: {context.get('mission_phase')} phase", "PASS")
                return True
            else:
                self.log(f"❌ Context update failed: {response}", "FAIL")
        return False
    
    def test_facial_analysis_storage(self):
        """Test facial analysis storage"""
        facial_data = {
            "astronaut_id": self.test_astronaut_id,
            "estimated_hr": 72.0,
            "mood_state": "focused",
            "mental_stress_index": 25.0,
            "fatigue_probability": 30.0
        }
        
        success, response = self.run_test(
            "Facial Analysis Storage",
            "POST",
            "/api/facial/analyze",
            200,
            data=facial_data
        )
        
        if success and isinstance(response, dict):
            if response.get('success') and response.get('record_id'):
                analysis = response.get('analysis_summary', {})
                self.log(f"✅ Facial analysis stored: mood={analysis.get('mood')}", "PASS")
                return True
            else:
                self.log(f"❌ Facial analysis failed: {response}", "FAIL")
        return False
    
    def test_get_context(self):
        """Test get context endpoint"""
        success, response = self.run_test(
            "Get Context",
            "GET",
            f"/api/context/{self.test_astronaut_id}",
            200
        )
        
        if success and isinstance(response, dict):
            required_fields = ['mission_phase', 'time_of_day', 'work_cycle']
            if all(field in response for field in required_fields):
                self.log(f"✅ Context retrieved: {response.get('mission_phase')} phase", "PASS")
                return True
            else:
                self.log(f"❌ Context missing fields: {response.keys()}", "FAIL")
        return False
    
    def test_get_alerts(self):
        """Test get alerts endpoint"""
        success, response = self.run_test(
            "Get Alerts",
            "GET",
            f"/api/alerts/{self.test_astronaut_id}",
            200
        )
        
        if success and isinstance(response, dict):
            if 'alerts' in response:
                alerts_count = len(response.get('alerts', []))
                self.log(f"✅ Alerts retrieved: {alerts_count} alerts", "PASS")
                return True
            else:
                self.log(f"❌ Alerts response missing 'alerts' field", "FAIL")
        return False
    
    def test_simulation_data_generation(self):
        """Test simulation data generation"""
        success, response = self.run_test(
            "Simulation Data Generation",
            "POST",
            f"/api/simulate/generate?astronaut_id={self.test_astronaut_id}&days=3",
            200
        )
        
        if success and isinstance(response, dict):
            if response.get('success') and response.get('records_created'):
                records = response.get('records_created', 0)
                self.log(f"✅ Generated {records} simulation records", "PASS")
                return True
            else:
                self.log(f"❌ Simulation generation failed: {response}", "FAIL")
        return False

def main():
    """Run all backend API tests"""
    print("=" * 60)
    print("ASTRA-CARE Backend API Test Suite")
    print("=" * 60)
    
    tester = AstraCareAPITester()
    
    # Test sequence - order matters for data dependencies
    test_results = []
    
    # Basic system tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_get_astronauts())
    
    # Data ingestion and retrieval
    test_results.append(tester.test_health_data_ingestion())
    test_results.append(tester.test_get_baseline())
    test_results.append(tester.test_get_timeline())
    
    # Context and analysis
    test_results.append(tester.test_mission_context_update())
    test_results.append(tester.test_get_context())
    test_results.append(tester.test_facial_analysis_storage())
    
    # Communication and alerts
    test_results.append(tester.test_chat_api())
    test_results.append(tester.test_get_alerts())
    
    # Data generation
    test_results.append(tester.test_simulation_data_generation())
    
    # Final results
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"Tests Passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL BACKEND TESTS PASSED!")
        return 0
    else:
        failed_count = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_count} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
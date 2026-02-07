#!/usr/bin/env python3
"""
RegulaPM Nexus Backend API Testing Suite
Tests all backend endpoints with proper authentication flows
"""

import requests
import json
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Base configuration
BASE_URL = "https://ai-governed-prd.preview.emergentagent.com/api"
TEST_ACCOUNT = {
    "email": "demo@regulapm.io",
    "password": "demo123"
}
PRE_GENERATED_BRIEF_ID = "4e6975a7-87a7-4e6b-b2af-ba1297aea11d"

class RegulaPMAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.test_user = None
        self.created_brief_id = None
        self.all_tests_results = {}
        
    def log_result(self, test_name: str, success: bool, message: str, response_data: Optional[Dict] = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.all_tests_results[test_name] = {
            "success": success,
            "message": message,
            "response_data": response_data
        }
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    timeout: int = 30, include_auth: bool = True) -> requests.Response:
        """Make HTTP request with proper headers and auth"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        # Include session token as cookie if available
        cookies = {}
        if include_auth and self.session_token:
            cookies["session_token"] = self.session_token
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, cookies=cookies, timeout=timeout)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, cookies=cookies, timeout=timeout)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, cookies=cookies, timeout=timeout)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, cookies=cookies, timeout=timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
        except requests.exceptions.Timeout:
            print(f"Request to {url} timed out after {timeout}s")
            raise
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            response = self.make_request("GET", "", include_auth=False)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "ok" and "RegulaPM Nexus" in data.get("app", ""):
                    self.log_result("Health Check", True, "API is responding correctly")
                else:
                    self.log_result("Health Check", False, f"Unexpected response: {data}")
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
    
    def test_signup(self):
        """Test user signup with unique email"""
        try:
            # Generate unique email for testing
            unique_email = f"test_{uuid.uuid4().hex[:8]}@regulapm.io"
            signup_data = {
                "email": unique_email,
                "password": "testpass123",
                "name": "Test User"
            }
            
            response = self.make_request("POST", "/auth/signup", signup_data, include_auth=False)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user") and data["user"].get("email") == unique_email:
                    # Check if session cookie is set
                    session_cookie = response.cookies.get("session_token")
                    if session_cookie:
                        self.log_result("Auth - Signup", True, f"User created successfully with email: {unique_email}")
                        return True
                    else:
                        self.log_result("Auth - Signup", False, "No session cookie returned")
                else:
                    self.log_result("Auth - Signup", False, f"Invalid response structure: {data}")
            elif response.status_code == 409:
                self.log_result("Auth - Signup", False, "Email already exists (expected for re-runs)")
            else:
                self.log_result("Auth - Signup", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Auth - Signup", False, f"Exception: {str(e)}")
        
        return False
    
    def test_login(self):
        """Test login with demo account"""
        try:
            response = self.make_request("POST", "/auth/login", TEST_ACCOUNT, include_auth=False)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user") and data["user"].get("email") == TEST_ACCOUNT["email"]:
                    # Store session token from cookie
                    session_cookie = response.cookies.get("session_token")
                    if session_cookie:
                        self.session_token = session_cookie
                        self.test_user = data["user"]
                        self.log_result("Auth - Login", True, f"Logged in successfully as: {TEST_ACCOUNT['email']}")
                        return True
                    else:
                        self.log_result("Auth - Login", False, "No session cookie returned")
                else:
                    self.log_result("Auth - Login", False, f"Invalid response structure: {data}")
            else:
                self.log_result("Auth - Login", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Auth - Login", False, f"Exception: {str(e)}")
        
        return False
    
    def test_auth_me(self):
        """Test GET /api/auth/me with session cookie"""
        if not self.session_token:
            self.log_result("Auth - Me", False, "No session token available")
            return False
        
        try:
            response = self.make_request("GET", "/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user") and data["user"].get("email") == TEST_ACCOUNT["email"]:
                    self.log_result("Auth - Me", True, f"Auth verification successful for: {data['user']['email']}")
                    return True
                else:
                    self.log_result("Auth - Me", False, f"Invalid response structure: {data}")
            elif response.status_code == 401:
                self.log_result("Auth - Me", False, "Authentication failed - invalid session")
            else:
                self.log_result("Auth - Me", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Auth - Me", False, f"Exception: {str(e)}")
        
        return False
    
    def test_list_briefs(self):
        """Test GET /api/briefs"""
        if not self.session_token:
            self.log_result("Briefs - List", False, "No session token available")
            return False
        
        try:
            response = self.make_request("GET", "/briefs")
            
            if response.status_code == 200:
                data = response.json()
                if "briefs" in data:
                    briefs_count = len(data["briefs"])
                    self.log_result("Briefs - List", True, f"Retrieved {briefs_count} briefs successfully")
                    return True
                else:
                    self.log_result("Briefs - List", False, f"Invalid response structure: {data}")
            elif response.status_code == 401:
                self.log_result("Briefs - List", False, "Authentication failed")
            else:
                self.log_result("Briefs - List", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Briefs - List", False, f"Exception: {str(e)}")
        
        return False
    
    def test_create_brief(self):
        """Test POST /api/briefs"""
        if not self.session_token:
            self.log_result("Briefs - Create", False, "No session token available")
            return False
        
        try:
            brief_data = {
                "title": f"Test Brief {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "input_type": "feature_idea",
                "main_input": "Test feature for automated testing - implement user dashboard with analytics",
                "industry_context": "Enterprise SaaS",
                "data_sensitivity": ["PII"],
                "geography": "US",
                "launch_type": "beta",
                "risk_tolerance": "medium"
            }
            
            response = self.make_request("POST", "/briefs", brief_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("brief") and data["brief"].get("id"):
                    self.created_brief_id = data["brief"]["id"]
                    self.log_result("Briefs - Create", True, f"Brief created with ID: {self.created_brief_id}")
                    return True
                else:
                    self.log_result("Briefs - Create", False, f"Invalid response structure: {data}")
            elif response.status_code == 401:
                self.log_result("Briefs - Create", False, "Authentication failed")
            else:
                self.log_result("Briefs - Create", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Briefs - Create", False, f"Exception: {str(e)}")
        
        return False
    
    def test_get_brief(self):
        """Test GET /api/briefs/:id"""
        if not self.session_token:
            self.log_result("Briefs - Get", False, "No session token available")
            return False
        
        # Use created brief if available, otherwise use pre-generated one
        brief_id = self.created_brief_id or PRE_GENERATED_BRIEF_ID
        
        try:
            response = self.make_request("GET", f"/briefs/{brief_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("brief") and data["brief"].get("id") == brief_id:
                    self.log_result("Briefs - Get", True, f"Retrieved brief {brief_id} successfully")
                    return True
                else:
                    self.log_result("Briefs - Get", False, f"Invalid response structure: {data}")
            elif response.status_code == 401:
                self.log_result("Briefs - Get", False, "Authentication failed")
            elif response.status_code == 404:
                self.log_result("Briefs - Get", False, f"Brief {brief_id} not found")
            else:
                self.log_result("Briefs - Get", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Briefs - Get", False, f"Exception: {str(e)}")
        
        return False
    
    def test_update_brief(self):
        """Test PUT /api/briefs/:id"""
        if not self.session_token or not self.created_brief_id:
            self.log_result("Briefs - Update", False, "No session token or created brief available")
            return False
        
        try:
            update_data = {
                "title": f"Updated Test Brief {datetime.now().strftime('%H%M%S')}",
                "main_input": "Updated description for testing purposes"
            }
            
            response = self.make_request("PUT", f"/briefs/{self.created_brief_id}", update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("brief") and data["brief"].get("id") == self.created_brief_id:
                    self.log_result("Briefs - Update", True, f"Brief {self.created_brief_id} updated successfully")
                    return True
                else:
                    self.log_result("Briefs - Update", False, f"Invalid response structure: {data}")
            elif response.status_code == 401:
                self.log_result("Briefs - Update", False, "Authentication failed")
            elif response.status_code == 404:
                self.log_result("Briefs - Update", False, f"Brief {self.created_brief_id} not found")
            else:
                self.log_result("Briefs - Update", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Briefs - Update", False, f"Exception: {str(e)}")
        
        return False
    
    def test_verify_pre_generated_brief(self):
        """Test GET /api/briefs/:id on pre-generated brief to verify generated content"""
        if not self.session_token:
            self.log_result("AI Pipeline - Verify Pre-Generated", False, "No session token available")
            return False
        
        try:
            response = self.make_request("GET", f"/briefs/{PRE_GENERATED_BRIEF_ID}")
            
            if response.status_code == 200:
                data = response.json()
                brief = data.get("brief")
                if not brief:
                    self.log_result("AI Pipeline - Verify Pre-Generated", False, "No brief in response")
                    return False
                
                # Check for generated content
                required_fields = ["prd_sections", "stakeholder_critiques", "checklist", "graph", "traceability"]
                missing_fields = [field for field in required_fields if not brief.get(field)]
                
                if not missing_fields:
                    # Additional validation
                    prd_count = len(brief["prd_sections"]) if isinstance(brief["prd_sections"], dict) else 0
                    stakeholder_count = len(brief["stakeholder_critiques"]) if isinstance(brief["stakeholder_critiques"], dict) else 0
                    
                    self.log_result("AI Pipeline - Verify Pre-Generated", True, 
                                  f"Pre-generated brief has all content: {prd_count} PRD sections, {stakeholder_count} stakeholder critiques")
                    return True
                else:
                    self.log_result("AI Pipeline - Verify Pre-Generated", False, 
                                  f"Missing generated content fields: {missing_fields}")
            elif response.status_code == 401:
                self.log_result("AI Pipeline - Verify Pre-Generated", False, "Authentication failed")
            elif response.status_code == 404:
                self.log_result("AI Pipeline - Verify Pre-Generated", False, f"Pre-generated brief {PRE_GENERATED_BRIEF_ID} not found")
            else:
                self.log_result("AI Pipeline - Verify Pre-Generated", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("AI Pipeline - Verify Pre-Generated", False, f"Exception: {str(e)}")
        
        return False
    
    def test_delete_brief(self):
        """Test DELETE /api/briefs/:id"""
        if not self.session_token or not self.created_brief_id:
            self.log_result("Briefs - Delete", False, "No session token or created brief available")
            return False
        
        try:
            response = self.make_request("DELETE", f"/briefs/{self.created_brief_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") is True:
                    self.log_result("Briefs - Delete", True, f"Brief {self.created_brief_id} deleted successfully")
                    self.created_brief_id = None  # Clear the ID since it's deleted
                    return True
                else:
                    self.log_result("Briefs - Delete", False, f"Invalid response structure: {data}")
            elif response.status_code == 401:
                self.log_result("Briefs - Delete", False, "Authentication failed")
            elif response.status_code == 404:
                self.log_result("Briefs - Delete", False, f"Brief {self.created_brief_id} not found")
            else:
                self.log_result("Briefs - Delete", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Briefs - Delete", False, f"Exception: {str(e)}")
        
        return False
    
    def test_seed_briefs(self):
        """Test POST /api/seed"""
        if not self.session_token:
            self.log_result("Seed Demo Briefs", False, "No session token available")
            return False
        
        try:
            response = self.make_request("POST", "/seed", {})
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and ("Seeded" in data["message"] or "already exist" in data["message"]):
                    self.log_result("Seed Demo Briefs", True, f"Seed operation completed: {data['message']}")
                    return True
                else:
                    self.log_result("Seed Demo Briefs", False, f"Invalid response structure: {data}")
            elif response.status_code == 401:
                self.log_result("Seed Demo Briefs", False, "Authentication failed")
            else:
                self.log_result("Seed Demo Briefs", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Seed Demo Briefs", False, f"Exception: {str(e)}")
        
        return False
    
    def test_logout(self):
        """Test POST /api/auth/logout"""
        if not self.session_token:
            self.log_result("Auth - Logout", False, "No session token available")
            return False
        
        try:
            response = self.make_request("POST", "/auth/logout", {})
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") is True:
                    # Check if session cookie is cleared
                    session_cookie = response.cookies.get("session_token")
                    if session_cookie == "" or not session_cookie:
                        self.session_token = None
                        self.log_result("Auth - Logout", True, "Logged out successfully, session cleared")
                        return True
                    else:
                        self.log_result("Auth - Logout", False, "Session cookie not properly cleared")
                else:
                    self.log_result("Auth - Logout", False, f"Invalid response structure: {data}")
            else:
                self.log_result("Auth - Logout", False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_result("Auth - Logout", False, f"Exception: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all backend API tests in proper sequence"""
        print(f"\n🚀 Starting RegulaPM Nexus Backend API Tests")
        print(f"Base URL: {BASE_URL}")
        print(f"Test Account: {TEST_ACCOUNT['email']}")
        print("-" * 60)
        
        # Test sequence following the review request
        self.test_health_check()
        self.test_signup()
        self.test_login()
        self.test_auth_me()
        self.test_list_briefs()
        self.test_create_brief()
        self.test_get_brief()
        self.test_update_brief()
        self.test_verify_pre_generated_brief()  # Verify pre-generated instead of generate
        self.test_seed_briefs()
        self.test_delete_brief()
        self.test_logout()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.all_tests_results.values() if result["success"])
        total = len(self.all_tests_results)
        
        for test_name, result in self.all_tests_results.items():
            status = "✅" if result["success"] else "❌"
            print(f"{status} {test_name}")
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = RegulaPMAPITester()
    success = tester.run_all_tests()
    
    # Exit with proper code
    exit(0 if success else 1)

if __name__ == "__main__":
    main()
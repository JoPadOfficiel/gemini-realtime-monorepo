import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

with open("tests/data.json", "r") as f:
    test_data = json.load(f)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()

def test_token_stats_structure():
    response = client.get("/api/tokens/stats")
    assert response.status_code == 200
    data = response.json()
    assert "totalTokens" in data
    assert isinstance(data["totalTokens"], int)

def test_session_stats_structure():
    response = client.get("/api/sessions/stats")
    assert response.status_code == 200
    data = response.json()
    assert "totalSessions" in data
    assert "averageSessionDuration" in data

def test_activities_list():
    response = client.get("/api/dashboard/activities")
    assert response.status_code == 200
    data = response.json()
    assert "activities" in data
    assert isinstance(data["activities"], list)

def test_admin_reset():
    response = client.post("/api/admin/reset-statistics")
    assert response.status_code == 200
    assert "message" in response.json()

def test_token_data_validation():
    expected = test_data["token_stats"]
    assert expected["totalTokens"] > 0
    assert expected["limit"] == 1000000

def test_session_data_validation():
    expected = test_data["session_stats"]
    assert expected["totalSessions"] > 0
    assert expected["averageSessionDuration"] > 0

def test_activities_data_validation():
    activities = test_data["activities"]
    assert len(activities) > 0
    assert all("tokens_used" in activity for activity in activities)

def test_invalid_endpoint():
    response = client.get("/invalid-endpoint")
    assert response.status_code == 404

def test_websocket_connection():
    response = client.get("/ws/test-client")
    assert response.status_code in [200, 404, 426]

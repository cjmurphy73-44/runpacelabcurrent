from fastapi.testclient import TestClient
from backend.main import app
import io

client = TestClient(app)

def test_import_workout_success():
    # Create a mock FIT/TCX/CSV file payload
    file_content = b"mock telemetry stream data..."
    response = client.post(
        "/api/v1/workouts/import",
        files={"file": ("morning_run.fit", io.BytesIO(file_content), "application/octet-stream")},
        params={"sex": "male", "resting_hr": 48.0, "max_hr": 188.0}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["filename"] == "morning_run.fit"
    assert "trimp" in data
    assert data["trimp"] > 0

def test_import_workout_unsupported_format():
    file_content = b"some text"
    response = client.post(
        "/api/v1/workouts/import",
        files={"file": ("workout.txt", io.BytesIO(file_content), "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_import_workout_empty_file():
    response = client.post(
        "/api/v1/workouts/import",
        files={"file": ("empty.fit", io.BytesIO(b""), "application/octet-stream")}
    )
    
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["detail"]

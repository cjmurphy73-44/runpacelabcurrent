from fastapi import FastAPI
from backend.routers import readiness, workouts

app = FastAPI(title="Run Pace Logic API", version="1.0.0")

app.include_router(readiness.router)
app.include_router(workouts.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Run Pace Logic API"}

from fastapi import FastAPI
from backend.routers import readiness

app = FastAPI(title="Run Pace Logic API", version="1.0.0")

app.include_router(readiness.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Run Pace Logic API"}

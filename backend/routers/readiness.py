from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from backend.science.engine import calculate_holistic_readiness, calculate_banister_trimp

router = APIRouter(prefix="/api/v1", tags=["readiness"])

class ReadinessRequest(BaseModel):
    current_metrics: Dict[str, float] = Field(..., description="Current biometric/performance metrics e.g. hrv_rmssd, resting_hr, sleep_hours, acute_load, chronic_load")
    historical_baselines: Dict[str, Dict[str, float]] = Field(..., description="Historical baseline statistics with mean and stddev for each metric")

class TRIMPRequest(BaseModel):
    duration_minutes: float = Field(..., gt=0, description="Duration of the exercise session in minutes")
    avg_heart_rate: float = Field(..., gt=0, description="Average heart rate during session")
    resting_heart_rate: float = Field(..., gt=0, description="Resting heart rate")
    max_heart_rate: float = Field(..., gt=0, description="Maximum heart rate")
    is_male: bool = Field(True, description="Biological sex factor for Banister formula weighting")

@router.post("/readiness")
def get_holistic_readiness(payload: ReadinessRequest):
    try:
        result = calculate_holistic_readiness(
            current_metrics=payload.current_metrics,
            historical_baselines=payload.historical_baselines
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/trimp")
def get_banister_trimp(payload: TRIMPRequest):
    try:
        trimp_score = calculate_banister_trimp(
            duration_minutes=payload.duration_minutes,
            avg_heart_rate=payload.avg_heart_rate,
            resting_heart_rate=payload.resting_heart_rate,
            max_heart_rate=payload.max_heart_rate,
            is_male=payload.is_male
        )
        return {
            "status": "success",
            "data": {
                "trimp": trimp_score
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

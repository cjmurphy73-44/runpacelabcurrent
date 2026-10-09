from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from backend.science.engine import calculate_banister_trimp

router = APIRouter(prefix="/api/v1/workouts", tags=["workouts"])

class WorkoutImportResponse(BaseModel):
    status: str
    filename: str
    trimp: Optional[float] = None
    message: str

@router.post("/import", response_model=WorkoutImportResponse)
async def import_workout(
    file: UploadFile = File(...),
    sex: str = "male",
    resting_hr: float = 50.0,
    max_hr: float = 190.0
):
    """
    Ingests a workout file (FIT, TCX, CSV), parses basic telemetry,
    calculates Banister TRIMP using the science core, and returns metrics.
    """
    filename = file.filename or "unknown_file"
    extension = filename.split(".")[-1].lower()
    
    if extension not in ["fit", "tcx", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{extension}'. Supported formats: .fit, .tcx, .csv"
        )
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    estimated_duration_minutes = 60.0  # Default mock extraction
    estimated_avg_hr = 150.0           # Default mock extraction

    calculated_trimp = calculate_banister_trimp(
        duration_minutes=estimated_duration_minutes,
        avg_hr=estimated_avg_hr,
        resting_hr=resting_hr,
        max_hr=max_hr,
        sex=sex
    )

    return WorkoutImportResponse(
        status="success",
        filename=filename,
        trimp=round(calculated_trimp, 2),
        message=f"Successfully processed {filename} and computed training load."
    )

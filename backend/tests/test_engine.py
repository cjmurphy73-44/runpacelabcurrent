import pytest
from backend.science.engine import (
    calculate_banister_trimp,
    compute_ewma_load,
    calculate_holistic_readiness
)

def test_banister_trimp_male():
    # Standard male calculation test
    trimp = calculate_banister_trimp(
        duration_minutes=60.0,
        avg_hr=150.0,
        resting_hr=50.0,
        max_hr=190.0,
        sex="male"
    )
    assert trimp > 0
    assert isinstance(trimp, float)

def test_banister_trimp_female():
    # Female calculation test (different coefficient a=0.86, b=1.67)
    trimp_female = calculate_banister_trimp(
        duration_minutes=60.0,
        avg_hr=150.0,
        resting_hr=50.0,
        max_hr=190.0,
        sex="female"
    )
    trimp_male = calculate_banister_trimp(
        duration_minutes=60.0,
        avg_hr=150.0,
        resting_hr=50.0,
        max_hr=190.0,
        sex="male"
    )
    # Female TRIMP should differ due to scaling coefficients
    assert trimp_female != trimp_male

def test_banister_trimp_edge_cases():
    # Invalid max_hr <= resting_hr should return 0.0
    assert calculate_banister_trimp(60, 150, 60, 60) == 0.0
    # Zero duration should return 0.0
    assert calculate_banister_trimp(0, 150, 50, 190) == 0.0

def test_compute_ewma_load():
    daily_trimps = [50.0, 0.0, 100.0, 25.0]
    results = compute_ewma_load(daily_trimps, initial_ctl=30.0, initial_atl=20.0)
    
    assert len(results) == 4
    for day in results:
        assert "trimp" in day
        assert "ctl" in day
        assert "atl" in day
        assert "tsb" in day
        # TSB = CTL - ATL
        assert day["tsb"] == round(day["ctl"] - day["atl"], 2)

def test_calculate_holistic_readiness():
    current_metrics = {
        "hrv_rmssd": 68.0,
        "resting_hr": 48.0,
        "sleep_score": 88.0,
        "tsb": 5.0
    }
    historical_baselines = {
        "hrv_rmssd": (60.0, 8.0),
        "resting_hr": (50.0, 3.0),
        "sleep_score": (80.0, 5.0),
        "tsb": (0.0, 10.0)
    }
    
    result = calculate_holistic_readiness(current_metrics, historical_baselines)
    
    assert result["status"] == "success"
    assert 0.0 <= result["readiness_score"] <= 100.0
    assert "hrv_rmssd" in result["breakdown"]
    assert result["breakdown"]["hrv_rmssd"]["status"] == "active"

def test_holistic_readiness_missing_data():
    # Missing some metrics should still compute using active weights
    current_metrics = {
        "hrv_rmssd": 60.0
    }
    historical_baselines = {
        "hrv_rmssd": (60.0, 8.0)
    }
    
    result = calculate_holistic_readiness(current_metrics, historical_baselines)
    assert result["status"] == "success"
    assert result["readiness_score"] is not None

"""
Core Math and Telemetry Science Engine
- Banister TRIMP Calculator (Sex-specific coefficients, HRR clamping)
- EWMA Daily Load Engine (CTL tau=42, ATL tau=7, TSB Form)
- Holistic Readiness Z-Score Engine (Directional normalization, weighted aggregation, null handling)
"""

import math
from typing import Dict, List, Optional, Any, Tuple


# ==========================================
# 1. Banister TRIMP Calculator
# ==========================================

def calculate_banister_trimp(
    duration_minutes: float,
    avg_hr: float,
    resting_hr: float,
    max_hr: float,
    sex: str = "male"
) -> float:
    """
    Calculate Banister Training Impulse (TRIMP) with sex-specific coefficients.
    
    TRIMP = duration_min * delta_HR * 0.64 * exp(b * delta_HR) for males
    TRIMP = duration_min * delta_HR * 0.86 * exp(b * delta_HR) for females
    where delta_HR = (avg_hr - resting_hr) / (max_hr - resting_hr), clamped [0, 1].
    """
    if max_hr <= resting_hr or duration_minutes <= 0:
        return 0.0

    # HRR fractional ratio
    hr_reserve = (avg_hr - resting_hr) / (max_hr - resting_hr)
    delta_hr = max(0.0, min(1.0, hr_reserve))

    if sex.lower() in ("female", "f"):
        a = 0.86
        b = 1.67
    else:
        a = 0.64
        b = 1.92

    trimp = duration_minutes * delta_hr * a * math.exp(b * delta_hr)
    return round(trimp, 2)


# ==========================================
# 2. EWMA Daily Load Engine
# ==========================================

def compute_ewma_load(
    daily_trimps: List[float],
    initial_ctl: float = 0.0,
    initial_atl: float = 0.0,
    ctl_tau: int = 42,
    atl_tau: int = 7
) -> List[Dict[str, float]]:
    """
    Compute Chronic Training Load (CTL), Acute Training Load (ATL), 
    and Training Stress Balance (TSB = CTL - ATL) over a series of daily TRIMPs.
    """
    lambda_ctl = 2.0 / (ctl_tau + 1.0)
    lambda_atl = 2.0 / (atl_tau + 1.0)

    ctl = initial_ctl
    atl = initial_atl

    results = []
    for trimp in daily_trimps:
        # EWMA update rule: Val_today = Val_yesterday + lambda * (TRIMP - Val_yesterday)
        ctl = ctl + lambda_ctl * (trimp - ctl)
        atl = atl + lambda_atl * (trimp - atl)
        tsb = ctl - atl

        results.append({
            "trimp": round(trimp, 2),
            "ctl": round(ctl, 2),
            "atl": round(atl, 2),
            "tsb": round(tsb, 2)
        })

    return results


# ==========================================
# 3. Holistic Readiness Z-Score Engine
# ==========================================

# Metric configuration: (default_weight, higher_is_better)
METRIC_CONFIGS = {
    "hrv_rmssd": {"weight": 0.25, "higher_is_better": True},
    "resting_hr": {"weight": 0.15, "higher_is_better": False},
    "sleep_score": {"weight": 0.20, "higher_is_better": True},
    "body_battery": {"weight": 0.15, "higher_is_better": True},
    "stress_score": {"weight": 0.10, "higher_is_better": False},
    "tsb": {"weight": 0.15, "higher_is_better": True}
}

def calculate_holistic_readiness(
    current_metrics: Dict[str, Optional[float]],
    historical_baselines: Dict[str, Tuple[float, float]]
) -> Dict[str, Any]:
    """
    Compute weighted holistic readiness score and directional z-scores.
    historical_baselines maps metric_name -> (mean, std_dev).
    Handles missing/null signals gracefully by redistributing weights.
    """
    valid_weighted_sum = 0.0
    total_active_weight = 0.0
    metric_breakdown = {}

    for metric, config in METRIC_CONFIGS.items():
        val = current_metrics.get(metric)
        if val is None or metric not in historical_baselines:
            metric_breakdown[metric] = {"z_score": None, "contribution": None, "status": "missing"}
            continue

        mean, std_dev = historical_baselines[metric]
        if std_dev == 0 or std_dev is None:
            z = 0.0
        else:
            z = (val - mean) / std_dev

        # Invert z-score if lower is better (e.g., resting HR, stress)
        if not config["higher_is_better"]:
            z = -z

        weight = config["weight"]
        valid_weighted_sum += z * weight
        total_active_weight += weight

        metric_breakdown[metric] = {
            "value": val,
            "z_score": round(z, 2),
            "weight": weight,
            "status": "active"
        }

    if total_active_weight == 0.0:
        return {
            "readiness_score": None,
            "readiness_z": None,
            "breakdown": metric_breakdown,
            "status": "insufficient_data"
        }

    # Normalize across available weights
    normalized_z = valid_weighted_sum / total_active_weight

    # Scale to a 0-100 score centered at 50 with standard deviation scaling (approx 0-100 clamped)
    # Using cumulative normal approximation or simple linear scale around z (-3 to +3) -> (0 to 100)
    score = max(0.0, min(100.0, 50.0 + (normalized_z * 16.67)))

    return {
        "readiness_score": round(score, 1),
        "readiness_z": round(normalized_z, 2),
        "breakdown": metric_breakdown,
        "status": "success"
    }

# PHYSIOLOGY LOGIC REFERENCE

## 1. Banister HR-based TRIMP (Training Impulse)
TRIMP = Duration (min) * HR_reserve_fraction * 0.64 * exp(1.92 * HR_reserve_fraction)
where:
- HR_reserve_fraction = (AvgHR - RestHR) / (MaxHR - RestHR)
- Coefficient adjusted for gender: 0.86 (men) / 1.67 (women)

## 2. Exponentially Weighted Moving Averages (EWMA)
- CTL (Fitness) = 42-day EWMA of daily Training Load (TRIMP)
- ATL (Fatigue) = 7-day EWMA of daily Training Load (TRIMP)
- TSB (Form) = CTL - ATL

Formula:
EMA_today = (Value_today * alpha) + (EMA_yesterday * (1 - alpha))
- alpha_ctl = 2 / (42 + 1)
- alpha_atl = 2 / (7 + 1)

## 3. Jack Daniels VDOT Pacing Zones
Zones derived from a single VDOT score (0.0 - 85.0 range).
- Easy: 59% - 74% of VO2max
- Marathon: 75% - 84% of VO2max
- Threshold: 85% - 89% of VO2max
- Interval: 95% - 97% of VO2max
- Repetition: 100% of VO2max

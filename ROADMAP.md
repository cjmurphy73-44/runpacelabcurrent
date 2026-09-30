# TrainPaceLab Production Roadmap

## P0 — Launch blockers (fix before any public push)
- [ ] P0.1 TrainingPlan page 500 (Axios): Fix TrainingPlan.jsx 500 load error and data shape/endpoint mismatch.
- [ ] P0.2 Dashboard widget runtime crashes: Wrap each widget in PageErrorBoundary / WipWrapper fallback.
- [ ] P0.3 LoadStatusCards NaN warnings: Guard divide-by-zero and missing-field cases.
- [ ] P0.4 Tools dropdown -> Physiology Lab link: Fix mobile/nested-nav tap target interaction.
- [ ] P0.5 Service-layer adapters: Audit src/services/adapters/base44/index.ts against live SDK shape and getConnection accessor.

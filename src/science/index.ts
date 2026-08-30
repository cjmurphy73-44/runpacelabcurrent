// src/science/index.ts
// Barrel for the auditable science namespace. Import from "@/science".
//
// Every function here is pure (no React, no I/O) and carries an inline citation
// header in its source file. Reviewers: `npm test` runs the golden-case suite in
// `__tests__/goldenCases.test.ts` against these implementations.

export * from './load';
export * from './trimp';
export * from './vdot';
export * from './zones';
export * from './grade';
export * from './environment';
export * from './thresholdPace';
export * from './injury';
export * from './racePacing';
export * from './racePrediction';
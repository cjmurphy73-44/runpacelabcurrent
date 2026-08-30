<<<<<<< Updated upstream
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
=======
/**
 * TrainPaceLab Science Namespace (`src/science/`)
 * 
 * Pure, typed, I/O-free physiological calculation engine with academic citation doc-comments.
 * 
 * @citation Banister (1982), Minetti (2002), Daniels (2013), Coggan (2003), Seiler (2006).
 */

export * from './types';
export * from './banister';
export * from './minetti';
export * from './daniels';
export * from './coggan';
export * from './aerobic';
>>>>>>> Stashed changes

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { logManualWorkout } from '../../shared/manualWorkout.ts';

Deno.serve((request) => logManualWorkout(createClientFromRequest(request), request));

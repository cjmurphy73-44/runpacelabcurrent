import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { reconcilePlannedWorkout } from '../../shared/plannedWorkout.ts';

Deno.serve((request) => reconcilePlannedWorkout(createClientFromRequest(request), request));

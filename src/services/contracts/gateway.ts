export interface BackendFunctionGateway {
  invoke(functionName: string, payload?: Record<string, any>): Promise<any>;
  generateTrainingPlan(payload: Record<string, any>): Promise<any>;
  ingestWorkoutFile(payload: Record<string, any>): Promise<any>;
  corosSync(payload: Record<string, any>): Promise<any>;
}

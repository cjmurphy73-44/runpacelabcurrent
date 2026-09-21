export interface BaseRepository<T> {
  list(filters?: Record<string, any>): Promise<T[]>;
  filter(filters?: Record<string, any>, sort?: string, limit?: number): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  subscribe?(callback: (payload: any) => void): () => void;
}

export interface WorkoutSessionRepository extends BaseRepository<any> {
  bulkCreate?(items: Partial<any>[]): Promise<any[]>;
  updateMany?(ids: string[], data: Partial<any>[]): Promise<any[]>;
  deleteMany?(ids: string[]): Promise<boolean>;
}

export interface DailyMetricsRepository extends BaseRepository<any> {}
export interface TrainingPlanRepository extends BaseRepository<any> {}
export interface AthleteProfileRepository extends BaseRepository<any> {}
export interface SubscriptionRepository extends BaseRepository<any> {}

import React, { createContext, useContext } from 'react';
import { 
  base44WorkoutSessionRepo, 
  base44DailyMetricsRepo, 
  base44TrainingPlanRepo, 
  base44AthleteProfileRepo, 
  base44SubscriptionRepo,
  base44CoachMessageRepo,
  base44TrainingPlanSessionRepo,
  base44FunctionGateway,
  base44AuthService,
  base44IntegrationsService,
  base44ConnectorGateway
} from '../adapters/base44';
import { 
  WorkoutSessionRepository, 
  DailyMetricsRepository, 
  TrainingPlanRepository, 
  AthleteProfileRepository, 
  SubscriptionRepository,
  CoachMessageRepository,
  TrainingPlanSessionRepository
} from '../contracts/repositories';
import { BackendFunctionGateway } from '../contracts/gateway';
import { AuthService } from '../contracts/auth';
import { IntegrationsService, ConnectorGateway } from '../contracts/integrations';

interface ServiceContextType {
  workoutSessionRepo: WorkoutSessionRepository;
  dailyMetricsRepo: DailyMetricsRepository;
  trainingPlanRepo: TrainingPlanRepository;
  athleteProfileRepo: AthleteProfileRepository;
  subscriptionRepo: SubscriptionRepository;
  coachMessageRepo: CoachMessageRepository;
  trainingPlanSessionRepo: TrainingPlanSessionRepository;
  functionGateway: BackendFunctionGateway;
  authService: AuthService;
  integrationsService: IntegrationsService;
  connectorGateway: ConnectorGateway;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

// Base44 is the production provider. An optional `services` override lets tests
// (and any future alternate runtime) inject a different adapter set — e.g. the
// in-memory adapter in src/services/adapters/memory — without touching the
// production path. When omitted, the Base44 adapter set is used.
export function ServiceProvider({ children, services: override }: { children: React.ReactNode; services?: ServiceContextType }) {
  const services: ServiceContextType = override ?? {
    workoutSessionRepo: base44WorkoutSessionRepo,
    dailyMetricsRepo: base44DailyMetricsRepo,
    trainingPlanRepo: base44TrainingPlanRepo,
    athleteProfileRepo: base44AthleteProfileRepo,
    subscriptionRepo: base44SubscriptionRepo,
    coachMessageRepo: base44CoachMessageRepo,
    trainingPlanSessionRepo: base44TrainingPlanSessionRepo,
    functionGateway: base44FunctionGateway,
    authService: base44AuthService,
    integrationsService: base44IntegrationsService,
    connectorGateway: base44ConnectorGateway,
  };

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useServices(): ServiceContextType {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}
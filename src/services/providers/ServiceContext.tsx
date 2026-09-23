import React, { createContext, useContext } from 'react';
import { 
  base44WorkoutSessionRepo, 
  base44DailyMetricsRepo, 
  base44TrainingPlanRepo, 
  base44AthleteProfileRepo, 
  base44SubscriptionRepo,
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
  SubscriptionRepository 
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
  functionGateway: BackendFunctionGateway;
  authService: AuthService;
  integrationsService: IntegrationsService;
  connectorGateway: ConnectorGateway;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export function ServiceProvider({ children, providerType = 'base44' }: { children: React.ReactNode; providerType?: string }) {
  // Currently wiring the Base44 adapter set; future providers can be selected via providerType
  const services: ServiceContextType = {
    workoutSessionRepo: base44WorkoutSessionRepo,
    dailyMetricsRepo: base44DailyMetricsRepo,
    trainingPlanRepo: base44TrainingPlanRepo,
    athleteProfileRepo: base44AthleteProfileRepo,
    subscriptionRepo: base44SubscriptionRepo,
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
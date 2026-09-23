import { base44 } from '@/api/base44Client';
import { 
  WorkoutSessionRepository, 
  DailyMetricsRepository, 
  TrainingPlanRepository, 
  AthleteProfileRepository, 
  SubscriptionRepository 
} from '../../contracts/repositories';
import { BackendFunctionGateway } from '../../contracts/gateway';
import { AuthService } from '../../contracts/auth';
import { IntegrationsService, ConnectorGateway } from '../../contracts/integrations';

function createEntityRepo(entityName: string) {
  const entity = base44.entities[entityName];
  return {
    async list(filters = {}) {
      if (!entity) return [];
      const res = await entity.list(filters);
      return res?.data || res || [];
    },
    async filter(filters = {}, sort?: string, limit?: number) {
      if (!entity) return [];
      if (typeof entity.filter === 'function') {
        try {
          const res = await entity.filter(filters, sort, limit);
          return res?.data || res || [];
        } catch (err) {
          console.warn(`Native entity.filter failed for ${entityName}, falling back to list:`, err);
        }
      }
      // Fallback to list if entity doesn't have native filter method or it threw
      const res = await entity.list(filters);
      let items = res?.data || res || [];
      // Client-side filtering if entity.list ignores filters
      if (filters && Object.keys(filters).length > 0 && items.length > 0) {
        items = items.filter(item => {
          return Object.entries(filters).every(([key, val]) => item[key] === val);
        });
      }
      if (sort && typeof sort === 'string' && items.length > 0) {
        const desc = sort.startsWith('-');
        const field = desc ? sort.slice(1) : sort;
        items = [...items].sort((a, b) => {
          if (a[field] < b[field]) return desc ? 1 : -1;
          if (a[field] > b[field]) return desc ? -1 : 1;
          return 0;
        });
      }
      if (typeof limit === 'number' && limit > 0) {
        items = items.slice(0, limit);
      }
      return items;
    },
    async get(id: string) {
      if (!entity) return null;
      const res = await entity.get(id);
      return res?.data || res || null;
    },
    async create(data: any) {
      if (!entity) throw new Error(`Entity ${entityName} not found`);
      const res = await entity.create(data);
      return res?.data || res;
    },
    async update(id: string, data: any) {
      if (!entity) throw new Error(`Entity ${entityName} not found`);
      const res = await entity.update(id, data);
      return res?.data || res;
    },
    async delete(id: string) {
      if (!entity) throw new Error(`Entity ${entityName} not found`);
      await entity.delete(id);
      return true;
    },
    subscribe(callback: (payload: any) => void) {
      if (entity && typeof entity.subscribe === 'function') {
        return entity.subscribe(callback);
      }
      return () => {};
    }
  };
}

export const base44WorkoutSessionRepo: WorkoutSessionRepository = {
  ...createEntityRepo('WorkoutSession'),
  async bulkCreate(items: any[]) {
    const entity = base44.entities['WorkoutSession'];
    if (entity && typeof entity.bulkCreate === 'function') {
      const res = await entity.bulkCreate(items);
      return res?.data || res;
    }
    return Promise.all(items.map(item => entity.create(item)));
  },
  async updateMany(ids: string[], dataArray: any[]) {
    const entity = base44.entities['WorkoutSession'];
    if (entity && typeof entity.updateMany === 'function') {
      const res = await entity.updateMany(ids, dataArray);
      return res?.data || res;
    }
    return Promise.all(ids.map((id, index) => entity.update(id, dataArray[index] || dataArray[0])));
  },
  async deleteMany(ids: string[]) {
    const entity = base44.entities['WorkoutSession'];
    if (entity && typeof entity.deleteMany === 'function') {
      await entity.deleteMany(ids);
      return true;
    }
    await Promise.all(ids.map(id => entity.delete(id)));
    return true;
  }
};

export const base44DailyMetricsRepo: DailyMetricsRepository = createEntityRepo('DailyMetrics');
export const base44TrainingPlanRepo: TrainingPlanRepository = createEntityRepo('TrainingPlan');
export const base44AthleteProfileRepo: AthleteProfileRepository = createEntityRepo('AthleteProfile');
export const base44SubscriptionRepo: SubscriptionRepository = createEntityRepo('Subscription');

export const base44FunctionGateway: BackendFunctionGateway = {
  async invoke(functionName: string, payload = {}) {
    if (base44.functions && typeof base44.functions.invoke === 'function') {
      return base44.functions.invoke(functionName, payload);
    }
    throw new Error('Base44 functions SDK not available');
  },
  async generateTrainingPlan(payload) {
    return this.invoke('generateTrainingPlan', payload);
  },
  async ingestWorkoutFile(payload) {
    return this.invoke('ingestWorkoutFile', payload);
  },
  async corosSync(payload) {
    return this.invoke('corosSync', payload);
  }
};

export const base44AuthService: AuthService = {
  async me() {
    if (base44.auth && typeof base44.auth.me === 'function') {
      return base44.auth.me();
    }
    return null;
  },
  async isAuthenticated() {
    try {
      const user = await this.me();
      return !!user;
    } catch {
      return false;
    }
  },
  async loginViaEmailPassword(credentials) {
    if (base44.auth && typeof base44.auth.loginViaEmailPassword === 'function') {
      return base44.auth.loginViaEmailPassword(credentials);
    }
    throw new Error('Auth loginViaEmailPassword not supported by SDK');
  },
  async loginWithProvider(provider, fromUrl) {
    if (base44.auth && typeof base44.auth.loginWithProvider === 'function') {
      return base44.auth.loginWithProvider(provider, fromUrl);
    }
    throw new Error('Auth loginWithProvider not supported by SDK');
  },
  async logout() {
    if (base44.auth && typeof base44.auth.logout === 'function') {
      return base44.auth.logout();
    }
  },
  async verifyOtp(payload) {
    if (base44.auth && typeof base44.auth.verifyOtp === 'function') {
      return base44.auth.verifyOtp(payload);
    }
    throw new Error('Auth verifyOtp not supported by SDK');
  },
  async resendOtp(email) {
    if (base44.auth && typeof base44.auth.resendOtp === 'function') {
      return base44.auth.resendOtp(email);
    }
    throw new Error('Auth resendOtp not supported by SDK');
  },

  async resetPasswordRequest(email) {
    if (base44.auth && typeof base44.auth.resetPasswordRequest === 'function') {
      return base44.auth.resetPasswordRequest(email);
    }
    throw new Error('Auth resetPasswordRequest not supported by SDK');
  },
  async resetPassword(payload) {
    if (base44.auth && typeof base44.auth.resetPassword === 'function') {
      return base44.auth.resetPassword(payload);
    }
    throw new Error('Auth resetPassword not supported by SDK');
  },
  async inviteUser(payload) {
    if (base44.auth && typeof base44.auth.inviteUser === 'function') {
      return base44.auth.inviteUser(payload);
    }
    throw new Error('Auth inviteUser not supported by SDK');
  }
};

export const base44IntegrationsService: IntegrationsService = {
  async invokeLLM(payload) {
    if (base44.integrations?.Core?.invokeLLM) {
      return base44.integrations.Core.invokeLLM(payload);
    }
    throw new Error('invokeLLM not available');
  },
  async uploadPublicFile(file, options) {
    if (base44.integrations?.Core?.uploadPublicFile) {
      return base44.integrations.Core.uploadPublicFile(file, options);
    }
    throw new Error('uploadPublicFile not available');
  },
  async uploadPrivateFile(file, options) {
    if (base44.integrations?.Core?.uploadPrivateFile) {
      return base44.integrations.Core.uploadPrivateFile(file, options);
    }
    throw new Error('uploadPrivateFile not available');
  },
  async generateImage(payload) {
    if (base44.integrations?.Core?.generateImage) {
      return base44.integrations.Core.generateImage(payload);
    }
    throw new Error('generateImage not available');
  },
  async generateSpeech(payload) {
    if (base44.integrations?.Core?.generateSpeech) {
      return base44.integrations.Core.generateSpeech(payload);
    }
    throw new Error('generateSpeech not available');
  },
  async sendEmail(payload) {
    if (base44.integrations?.Core?.sendEmail) {
      return base44.integrations.Core.sendEmail(payload);
    }
    throw new Error('sendEmail not available');
  },
  async createFileSignedUrl(payload) {
    if (base44.integrations?.Core?.createFileSignedUrl) {
      return base44.integrations.Core.createFileSignedUrl(payload);
    }
    throw new Error('createFileSignedUrl not available');
  },
  async extractDataFromUploadedFile(payload) {
    if (base44.integrations?.Core?.extractDataFromUploadedFile) {
      return base44.integrations.Core.extractDataFromUploadedFile(payload);
    }
    throw new Error('extractDataFromUploadedFile not available');
  }
};

export const base44ConnectorGateway: ConnectorGateway = {
  async airtable(action, payload) {
    if (base44.connectors?.airtable) {
      return base44.connectors.airtable(action, payload);
    }
    throw new Error('Airtable connector not available');
  },
  async github(action, payload) {
    if (base44.connectors?.github) {
      return base44.connectors.github(action, payload);
    }
    throw new Error('GitHub connector not available');
  }
};

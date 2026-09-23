// src/services/adapters/memory/index.ts
//
// Provider-agnostic in-memory adapter: a complete, Base44-free implementation of
// every service contract (repositories, auth, function gateway, integrations,
// connectors). It exists to PROVE the contract interfaces are complete and
// swappable — the app's UI talks only to `useServices()`, so any adapter that
// satisfies these contracts can drive the app. Base44 remains the production
// provider; this adapter backs the provider-agnostic test suite and can be
// injected into <ServiceProvider services={...}> for component tests.

import {
  WorkoutSessionRepository,
  DailyMetricsRepository,
  TrainingPlanRepository,
  AthleteProfileRepository,
  SubscriptionRepository,
  CoachMessageRepository,
  TrainingPlanSessionRepository,
} from '../../contracts/repositories';
import { BackendFunctionGateway } from '../../contracts/gateway';
import { AuthService } from '../../contracts/auth';
import { IntegrationsService, ConnectorGateway } from '../../contracts/integrations';

type ID = string;

function uid(prefix = 'id'): ID {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- Minimal query matcher -------------------------------------------------
// Supports the operator subset the hooks/pages actually issue: equality,
// $eq, $ne, $lte, $gte, $lt, $gt, $in, $or, $and. Enough to be a faithful
// stand-in for the Base44 entity filter semantics in tests.
function matchValue(recordVal: any, cond: any): boolean {
  if (cond && typeof cond === 'object' && !Array.isArray(cond) && Object.keys(cond).some(k => k.startsWith('$'))) {
    for (const [op, val] of Object.entries(cond)) {
      switch (op) {
        case '$eq': if (recordVal !== val) return false; break;
        case '$ne': if (recordVal === val) return false; break;
        case '$lte': if (!(recordVal <= val)) return false; break;
        case '$gte': if (!(recordVal >= val)) return false; break;
        case '$lt': if (!(recordVal < val)) return false; break;
        case '$gt': if (!(recordVal > val)) return false; break;
        case '$in': if (!Array.isArray(val) || !val.includes(recordVal)) return false; break;
        default: break;
      }
    }
    return true;
  }
  return recordVal === cond;
}

function match(record: any, filters: Record<string, any>): boolean {
  for (const [key, cond] of Object.entries(filters)) {
    if (key === '$or') {
      if (!Array.isArray(cond) || !cond.some((sub: any) => match(record, sub))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(cond) || !cond.every((sub: any) => match(record, sub))) return false;
      continue;
    }
    if (!matchValue(record[key], cond)) return false;
  }
  return true;
}

// --- In-memory repository --------------------------------------------------
function createMemoryRepo<T extends { id?: string }>(entityName: string) {
  const store = new Map<ID, T & { id: ID; created_date: string; updated_date: string }>();
  const subs = new Set<(e: { id: ID; type: string; data: any }) => void>();

  function emit(type: string, data: any) {
    for (const cb of subs) cb({ id: uid('evt'), type, data });
  }

  const repo = {
    entityName,
    async list(filters: Record<string, any> = {}): Promise<any[]> {
      let items = Array.from(store.values());
      if (filters && Object.keys(filters).length) items = items.filter(r => match(r, filters));
      return items;
    },
    async filter(filters: Record<string, any> = {}, sort?: string, limit?: number): Promise<any[]> {
      let items = await repo.list(filters);
      if (sort && typeof sort === 'string') {
        const desc = sort.startsWith('-');
        const field = desc ? sort.slice(1) : sort;
        items = [...items].sort((a: any, b: any) => {
          if (a[field] < b[field]) return desc ? 1 : -1;
          if (a[field] > b[field]) return desc ? -1 : 1;
          return 0;
        });
      }
      if (typeof limit === 'number' && limit > 0) items = items.slice(0, limit);
      return items;
    },
    async get(id: ID): Promise<any | null> {
      return store.get(id) ?? null;
    },
    async create(data: Partial<T>): Promise<any> {
      const now = new Date().toISOString();
      const record = {
        id: uid(entityName),
        created_date: now,
        updated_date: now,
        created_by_id: 'memory-user',
        ...(data as any),
      } as any;
      store.set(record.id, record);
      emit('create', record);
      return record;
    },
    async bulkCreate(items: Partial<T>[]): Promise<any[]> {
      const out: any[] = [];
      for (const it of items) out.push(await repo.create(it));
      return out;
    },
    async update(id: ID, data: Partial<T>): Promise<any> {
      const existing = store.get(id);
      if (!existing) throw new Error(`${entityName} ${id} not found`);
      const updated = { ...existing, ...(data as any), updated_date: new Date().toISOString() };
      store.set(id, updated);
      emit('update', updated);
      return updated;
    },
    async updateMany(query: Record<string, any> | ID[], dataOrArray: any): Promise<any[]> {
      // Two call shapes: (ids[],dataArray[]) OR (filterQuery, mongoStyleUpdate).
      if (Array.isArray(query)) {
        const ids = query as ID[];
        const arr = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
        const out: any[] = [];
        for (let i = 0; i < ids.length; i++) out.push(await repo.update(ids[i], arr[i] ?? arr[0]));
        return out;
      }
      const matches = await repo.list(query as Record<string, any>);
      const out: any[] = [];
      for (const m of matches) {
        const patch = (dataOrArray && dataOrArray.$set) ? dataOrArray.$set : dataOrArray;
        out.push(await repo.update(m.id, patch));
      }
      return out;
    },
    async delete(id: ID): Promise<boolean> {
      const had = store.delete(id);
      if (had) emit('delete', { id });
      return had;
    },
    async deleteMany(query: Record<string, any> | ID[]): Promise<boolean> {
      if (Array.isArray(query)) {
        for (const id of query) store.delete(id);
        return true;
      }
      const matches = await repo.list(query as Record<string, any>);
      for (const m of matches) store.delete(m.id);
      return true;
    },
    subscribe(callback: (e: any) => void): () => void {
      subs.add(callback);
      return () => subs.delete(callback);
    },
    // test-only seed helper
    _seed(records: any[]) {
      for (const r of records) store.set(r.id, { created_date: new Date().toISOString(), updated_date: new Date().toISOString(), created_by_id: 'memory-user', ...r });
    },
    _clear() { store.clear(); },
  };
  return repo;
}

export const memoryWorkoutSessionRepo = createMemoryRepo('WorkoutSession') as unknown as WorkoutSessionRepository;
export const memoryDailyMetricsRepo = createMemoryRepo('DailyMetrics') as unknown as DailyMetricsRepository;
export const memoryTrainingPlanRepo = createMemoryRepo('TrainingPlan') as unknown as TrainingPlanRepository;
export const memoryAthleteProfileRepo = createMemoryRepo('AthleteProfile') as unknown as AthleteProfileRepository;
export const memorySubscriptionRepo = createMemoryRepo('Subscription') as unknown as SubscriptionRepository;
export const memoryCoachMessageRepo = createMemoryRepo('CoachMessage') as unknown as CoachMessageRepository;
export const memoryTrainingPlanSessionRepo = createMemoryRepo('TrainingPlanSession') as unknown as TrainingPlanSessionRepository;

// --- Auth ------------------------------------------------------------------
let memoryUser: any = null;

export const memoryAuthService: AuthService = {
  async me() { if (!memoryUser) throw new Error('Not authenticated'); return memoryUser; },
  async isAuthenticated() { return !!memoryUser; },
  async loginViaEmailPassword(credentials: Record<string, any>) {
    memoryUser = { id: 'memory-user', email: credentials?.email || 'tester@memory.local', full_name: 'Memory Tester', role: 'user' };
    return memoryUser;
  },
  async loginWithProvider(_provider: string, _fromUrl?: string) {
    memoryUser = { id: 'memory-user', email: 'oauth@memory.local', full_name: 'OAuth Tester', role: 'user' };
    return memoryUser;
  },
  async logout(_redirectUrl?: string) { memoryUser = null; },
  async register(credentials: Record<string, any>) {
    memoryUser = { id: 'memory-user', email: credentials?.email, full_name: 'Memory Tester', role: 'user' };
    return { id: memoryUser.id, email: memoryUser.email };
  },
  async verifyOtp(_payload: Record<string, any>) {
    memoryUser = memoryUser || { id: 'memory-user', email: 'verified@memory.local', role: 'user' };
    return { access_token: 'memory-token' };
  },
  async resendOtp(_email: string) { return { ok: true }; },
  async resetPasswordRequest(_email: string) { return { ok: true }; },
  async resetPassword(_payload: Record<string, any>) { return { ok: true }; },
  async inviteUser(_payload: Record<string, any>) { return { ok: true }; },
  async redirectToLogin(_nextUrl?: string) { /* no-op in memory */ },
  async getAppPublicSettings(_appId?: string) { return { id: _appId || 'memory-app', public_settings: 'public_without_login' }; },
  async updateMe(data: Record<string, any>) { memoryUser = { ...memoryUser, ...data }; return memoryUser; },
};

// --- Function gateway ------------------------------------------------------
export const memoryFunctionGateway: BackendFunctionGateway = {
  async invoke(functionName: string, payload: Record<string, any> = {}) {
    // Return canned, deterministic responses per known function so hooks/pages
    // that call the gateway behave correctly without a live backend.
    switch (functionName) {
      case 'generateTrainingPlan':
        return { status: 'ok', plan: { plan_title: 'Memory Plan', weekly_plans: [] } };
      case 'ingestWorkoutFile':
        return { status: 'ok', session_id: uid('session') };
      case 'corosSync':
        return { status: 'ok', synced: 0 };
      case 'autoReplanOnDeviation':
        return { status: 'ok', summary: 'Memory coach rebalanced the week.' };
      default:
        return { status: 'ok', function: functionName, payload };
    }
  },
  async generateTrainingPlan(payload) { return this.invoke('generateTrainingPlan', payload); },
  async ingestWorkoutFile(payload) { return this.invoke('ingestWorkoutFile', payload); },
  async corosSync(payload) { return this.invoke('corosSync', payload); },
};

// --- Integrations ----------------------------------------------------------
export const memoryIntegrationsService: IntegrationsService = {
  async invokeLLM(payload: Record<string, any>) {
    if (payload?.response_json_schema) return { result: 'memory-llm-structured-response' };
    return 'memory-llm-response';
  },
  async uploadPublicFile(_file: any, _options?: Record<string, any>) { return { file_url: 'memory://public/file.bin' }; },
  async uploadPrivateFile(_file: any, _options?: Record<string, any>) { return { file_uri: 'memory://private/file.bin' }; },
  async generateImage(_payload: Record<string, any>) { return { url: 'memory://image.png' }; },
  async generateSpeech(_payload: Record<string, any>) { return { url: 'memory://speech.mp3' }; },
  async sendEmail(_payload: Record<string, any>) { return { status: 'sent', captured: true }; },
  async createFileSignedUrl(payload: Record<string, any>) { return { signed_url: `memory://signed/${payload?.file_uri || 'file'}` }; },
  async extractDataFromUploadedFile(_payload: Record<string, any>) { return { status: 'success', output: [] }; },
};

// --- Connectors ------------------------------------------------------------
export const memoryConnectorGateway: ConnectorGateway = {
  async airtable(action: string, _payload: Record<string, any>) { return { ok: true, action, records: [] }; },
  async github(action: string, _payload: Record<string, any>) { return { ok: true, action }; },
};

// --- Bundle ----------------------------------------------------------------
export function createMemoryServices() {
  return {
    workoutSessionRepo: memoryWorkoutSessionRepo,
    dailyMetricsRepo: memoryDailyMetricsRepo,
    trainingPlanRepo: memoryTrainingPlanRepo,
    athleteProfileRepo: memoryAthleteProfileRepo,
    subscriptionRepo: memorySubscriptionRepo,
    coachMessageRepo: memoryCoachMessageRepo,
    trainingPlanSessionRepo: memoryTrainingPlanSessionRepo,
    functionGateway: memoryFunctionGateway,
    authService: memoryAuthService,
    integrationsService: memoryIntegrationsService,
    connectorGateway: memoryConnectorGateway,
  };
}

export function resetMemoryAdapter() {
  for (const r of [memoryWorkoutSessionRepo, memoryDailyMetricsRepo, memoryTrainingPlanRepo, memoryAthleteProfileRepo, memorySubscriptionRepo, memoryCoachMessageRepo, memoryTrainingPlanSessionRepo]) {
    (r as any)._clear?.();
  }
  memoryUser = null;
}
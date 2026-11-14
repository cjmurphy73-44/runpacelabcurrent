import { describe, expect, it } from 'vitest';
import { issueRaceWorkerToken, verifyRaceWorkerToken } from '../../../infra/race-d1/workerAuth';

const secret = 'staging-only-test-secret-not-real-0123456789';
const productionSecret = 'production-synthetic-different-secret-9876543210';
const claims = { secret, issuer: 'tpl-staging', audience: 'tpl-race-worker-staging',
  environment: 'staging', ownerId: 'synthetic-athlete-a', nowSeconds: 1000000,
  nonce: 'synthetic-nonce-123456' };
const verify = (token, overrides = {}) => verifyRaceWorkerToken({
  token, secret, issuer: claims.issuer, audience: claims.audience,
  environment: claims.environment, nowSeconds: claims.nowSeconds, ...overrides,
});
describe('server-only RaceResult Worker authorization envelope', () => {
  it('accepts valid staging-scoped token and derives owner from signed subject', async () => {
    const token = await issueRaceWorkerToken(claims);
    expect((await verify(token)).ownerId).toBe('synthetic-athlete-a');
  });
  it('rejects mismatched audience', async () => {
    const token = await issueRaceWorkerToken(claims);
    await expect(verify(token, { audience: 'tpl-race-worker-production' })).rejects.toThrow('invalid_claims');
  });
  it('rejects mismatched environment and issuer', async () => {
    const token = await issueRaceWorkerToken(claims);
    await expect(verify(token, { environment: 'production' })).rejects.toThrow('invalid_claims');
    await expect(verify(token, { issuer: 'tpl-production' })).rejects.toThrow('invalid_claims');
  });
  it('rejects a token signed with another environment secret', async () => {
    const token = await issueRaceWorkerToken(claims);
    await expect(verify(token, { secret: productionSecret })).rejects.toThrow('invalid_signature');
  });
  it('rejects expired tokens', async () => {
    const token = await issueRaceWorkerToken(claims);
    await expect(verify(token, { nowSeconds: claims.nowSeconds + 60 })).rejects.toThrow('invalid_claims');
  });
  it('rejects future-issued tokens beyond clock skew', async () => {
    const token = await issueRaceWorkerToken({ ...claims, nowSeconds: claims.nowSeconds + 100 });
    await expect(verify(token)).rejects.toThrow('invalid_claims');
  });
  it('rejects tampering', async () => {
    const token = await issueRaceWorkerToken(claims);
    const [body, signature] = token.split('.');
    await expect(verify(body.slice(0, -1) + (body.endsWith('A') ? 'B' : 'A') + '.' + signature))
      .rejects.toThrow();
  });
  it('rejects weak signing secrets and missing nonce', async () => {
    await expect(issueRaceWorkerToken({ ...claims, secret: 'weak' })).rejects.toThrow('weak_secret');
    await expect(issueRaceWorkerToken({ ...claims, nonce: '' })).rejects.toThrow('invalid_claims');
  });
});

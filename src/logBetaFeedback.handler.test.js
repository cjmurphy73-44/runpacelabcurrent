// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual backend handler with an injected in-memory SDK. Never
// import the remote npm: SDK or create a real Base44 client.
const source = readFileSync(
  new URL('../base44/functions/logBetaFeedback/entry.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness({ failCreate = false } = {}) {
  const create = vi.fn(async () => {
    if (failCreate) throw new Error('PRIVATE_SYNTHETIC_SDK_SECRET');
    return { id: 'synthetic-record-id' };
  });
  const error = vi.fn();
  const exports = {};
  const requireMock = (specifier) => {
    if (specifier !== 'npm:@base44/sdk@0.8.44') {
      throw new Error('Unexpected dependency: ' + specifier);
    }
    return {
      createClientFromRequest: () => ({
        asServiceRole: { entities: { BetaFeedback: { create } } },
      }),
    };
  };
  runInNewContext(compiled, {
    exports, require: requireMock, Request, Response,
    console: { error },
  }, { timeout: 1000 });
  return { handler: exports.default, create, error };
}

function request(body) {
  return new Request('http://localhost.invalid/support', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('logBetaFeedback actual handler with synthetic Base44 SDK', () => {
  it.each([
    {},
    { message: '' },
    { message: '   ' },
    { message: { unexpected: true } },
    { message: 'x'.repeat(4001) },
    { message: 'valid', contact_email: { unsafe: true } },
    { message: 'valid', contact_email: 'a'.repeat(201) },
  ])('rejects invalid anonymous input without privileged writes (%#)', async (body) => {
    const { handler, create } = harness();
    const response = await handler(request(body));
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts valid anonymous input and returns only confirmed record identity', async () => {
    const { handler, create } = harness();
    const response = await handler(request({
      feedback_type: 'idea', message: 'Synthetic report',
      contact_email: 'test@example.invalid', route: '/support',
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, id: 'synthetic-record-id' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      feedback_type: 'idea', message: 'Synthetic report',
      contact_email: 'test@example.invalid', route: '/support',
    });
  });

  it('never discloses SDK exception text in response or logs', async () => {
    const { handler, create, error } = harness({ failCreate: true });
    const response = await handler(request({ message: 'Synthetic report' }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Support request could not be confirmed',
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('logBetaFeedback: submission failed');
    expect(JSON.stringify(error.mock.calls)).not.toContain('PRIVATE_SYNTHETIC_SDK_SECRET');
  });
});

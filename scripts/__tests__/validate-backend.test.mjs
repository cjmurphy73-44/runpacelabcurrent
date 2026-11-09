import { describe, expect, it } from 'vitest';
import { parseResource, validateEntity } from '../validate-backend.mjs';

describe('offline backend validation', () => {
  it('accepts comments but rejects broken resource syntax', () => {
    expect(parseResource('{ // comment\n "name": "Test" }', 'test.jsonc').name).toBe('Test');
    expect(() => parseResource('{ "name": }', 'broken.jsonc')).toThrow('broken.jsonc');
  });
  it('rejects undefined required fields and malformed permission rules', () => {
    const entity = {
      name: 'Test', type: 'object', properties: { owner_id: { type: 'string' } }, required: ['owner_id'],
      rls: Object.fromEntries(['create', 'read', 'update', 'delete'].map(action => [action, { created_by_id: '{{user.id}}' }])),
    };
    expect(() => validateEntity(entity, 'Test.jsonc')).not.toThrow();
    expect(() => validateEntity({ ...entity, required: ['missing'] }, 'Test.jsonc')).toThrow('not defined');
    expect(() => validateEntity({ ...entity, rls: { read: 'everyone' } }, 'Test.jsonc')).toThrow('invalid read RLS');
  });
});

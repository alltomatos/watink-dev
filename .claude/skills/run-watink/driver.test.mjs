import test from 'node:test';
import assert from 'node:assert/strict';
import { backendHealthCandidates } from './driver.mjs';

test('backendHealthCandidates prefers compose business port before local dev port', () => {
  assert.deepEqual(backendHealthCandidates(), [
    'http://localhost/api/v1/health',
    'http://localhost:8082/api/v1/health',
  ]);
});

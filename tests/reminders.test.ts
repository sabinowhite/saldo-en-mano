import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState } from '../src/domain/finance.ts';
import { reminderPlan } from '../src/domain/reminder-plan.ts';
test('recordatorios son futuros, limitados y no revelan cifras o acreedores', () => {
  const now = new Date(2026, 10, 17, 12); const state = demoState('2026-11-17');
  const plan = reminderPlan(state, now);
  assert.ok(plan.length > 0 && plan.length <= 50);
  assert.ok(plan.every(p => p.at > now));
  assert.equal(new Set(plan.map(p => p.id)).size, plan.length);
  assert.ok(plan.every(p => !p.body.includes('500') && !p.body.includes('Familiar')));
  assert.deepEqual(reminderPlan(state, now), plan);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { available, demoState, financeReducer, remainingReserve } from '../src/domain/finance.ts';
import { nextScheduled } from '../src/domain/schedule.ts';
import { createInitialState } from '../src/domain/setup.ts';
import { decodeState, encodeState } from '../src/storage/validation.ts';
const date = '2026-11-17';
const start = () => createInitialState({ date: '2026-01-01', bankCents: 1000000, cashCents: 100000, settings: { salaryCents: 1400000, frequency: 'fortnightly', offeringPercent: 5 } }, date);

test('apartado editable reserva dinero y entrega parcial descuenta una sola vez', () => {
  let s = financeReducer(start(), { type: 'save-reserves', reserves: [{ id: 'r', concept: 'Primicias', cents: 20000, account: 'bank', delivered: false, date }] });
  assert.equal(available(s), 1080000);
  s = financeReducer(s, { type: 'deliver', id: 'r', entryId: 'delivery', date, cents: 5000, account: 'bank' });
  assert.equal(s.balances.bank, 995000); assert.equal(remainingReserve(s.reserves[0]), 15000); assert.equal(available(s), 1080000);
  s = financeReducer(s, { type: 'save-reserves', reserves: [{ ...s.reserves[0], cents: 30000, account: 'cash' }] });
  assert.equal(remainingReserve(s.reserves[0]), 25000); assert.equal(available(s), 1070000);
  assert.throws(() => financeReducer(s, { type: 'save-reserves', reserves: [{ ...s.reserves[0], cents: 4000 }] }));
  const cancelled = financeReducer(s, { type: 'cancel-reserve', id: 'r' });
  assert.equal(remainingReserve(cancelled.reserves[0]), 0); assert.equal(cancelled.entries.length, 1);
});
test('pago variable cambia monto y origen al confirmar y libera la reserva previa', () => {
  let s = financeReducer(start(), { type: 'save-payment', payment: { id: 'p', concept: 'Tarjeta', cents: 20000, account: 'bank', date, reserved: true, paid: false } });
  s = financeReducer(s, { type: 'payment', id: 'p', date, entryId: 'pay', cents: 25000, account: 'cash' });
  assert.equal(s.balances.bank, 1000000); assert.equal(s.balances.cash, 75000);
  assert.equal(available(s), 1075000); assert.equal(s.payments[0].cents, 25000); assert.equal(s.payments[0].account, 'cash');
  assert.deepEqual(financeReducer(s, { type: 'payment', id: 'p', date, entryId: 'again', cents: 30000 }), s);
});
test('edición y eliminación de un abono actualizan deuda y cuenta sin duplicar dinero', () => {
  let s = financeReducer(start(), { type: 'save-debt', operationId: 'create', date, debt: { id: 'd', concept: 'Préstamo', creditor: 'Persona', cents: 100000, monthlyCents: 0 } });
  s = financeReducer(s, { type: 'debt', id: 'd', entryId: 'abono', date, cents: 20000, account: 'bank' });
  const changed = { ...s.entries[0], cents: 30000, account: 'cash' as const };
  s = financeReducer(s, { type: 'edit-entry', entry: changed, operationId: 'edit', today: date });
  assert.equal(s.debts[0].cents, 70000); assert.equal(s.balances.bank, 1000000); assert.equal(s.balances.cash, 70000);
  assert.deepEqual(financeReducer(s, { type: 'edit-entry', entry: changed, operationId: 'edit', today: date }), s);
  s = financeReducer(s, { type: 'delete-entry', id: 'abono', operationId: 'delete', today: date });
  assert.equal(s.debts[0].cents, 100000); assert.equal(s.balances.cash, 100000); assert.equal(s.edits?.length, 2);
  assert.equal(decodeState(encodeState(s)).debts[0].cents, 100000);
});
test('corregir entrega y deshacer pago preserva la relación con el pendiente', () => {
  let s = financeReducer(demoState(date), { type: 'deliver', id: 'tithe', entryId: 'deliver', date, cents: 10000 });
  s = financeReducer(s, { type: 'edit-entry', entry: { ...s.entries[0], cents: 15000 }, operationId: 'edit-r', today: date });
  assert.equal(remainingReserve(s.reserves[0]), 125000);
  s = financeReducer(s, { type: 'payment', id: 'card', entryId: 'pay-card', date });
  s = financeReducer(s, { type: 'delete-entry', id: 'pay-card', operationId: 'undo-card', today: date });
  assert.equal(s.payments.find(p => p.id === 'card')?.paid, false);
  assert.equal(s.entries.filter(e => e.id === 'pay-card').length, 0);
});
test('calendario quincenal y mensual conserva días ancla, incluso febrero', () => {
  assert.equal(nextScheduled('2026-11-01', 'fortnightly'), '2026-11-16');
  assert.equal(nextScheduled('2026-11-16', 'fortnightly'), '2026-12-01');
  assert.equal(nextScheduled('2028-01-31', 'monthly', 31), '2028-02-29');
  assert.equal(nextScheduled('2028-02-29', 'monthly', 31), '2028-03-31');
  assert.equal(nextScheduled('2026-12-31', 'bimonthly', 31), '2027-02-28');
});
test('programaciones recuperan meses sin abrir sin duplicar pagos confirmados', () => {
  let s = financeReducer(start(), { type: 'save-template', today: '2026-01-15', template: { id: 'internet', concept: 'Internet', cents: 35000, account: 'bank', reserved: false, variable: false, frequency: 'monthly', nextDate: '2026-01-20', anchorDay: 20, enabled: true, reminder: true } });
  assert.equal(s.payments.length, 1);
  s = financeReducer(s, { type: 'payment', id: s.payments[0].id, entryId: 'jan-pay', date: '2026-01-20' });
  s = financeReducer(s, { type: 'tick', today: '2026-04-21' });
  assert.equal(s.payments.length, 4); assert.equal(s.payments.filter(p => p.paid).length, 1);
  const again = financeReducer(s, { type: 'tick', today: '2026-04-21' });
  assert.deepEqual(again, s);
  const edited = financeReducer(s, { type: 'save-template', today: '2026-04-21', template: { ...s.templates![0], cents: 40000 } });
  assert.equal(edited.payments.length, 4); // Editing is not an early materialization of another future bill.
  assert.equal(edited.payments.find(p => p.date === '2026-02-20')?.cents, 35000);
});
test('cargo mensual aumenta deuda una sola vez sin afectar banco o efectivo', () => {
  let s = financeReducer(start(), { type: 'save-debt', date: '2026-01-01', operationId: 'create', debt: { id: 'd', creditor: 'Persona', concept: 'Servicio', cents: 50000, monthlyCents: 10000, nextChargeDate: '2026-01-31', anchorDay: 31 } });
  s = financeReducer(s, { type: 'tick', today: '2026-03-31' });
  assert.equal(s.debts[0].cents, 80000); assert.equal(s.debtEvents?.length, 4);
  assert.deepEqual(s.balances, start().balances);
  assert.deepEqual(financeReducer(s, { type: 'tick', today: '2026-03-31' }), s);
  const adjustment = { type: 'save-debt' as const, date, operationId: 'adjust', debt: { ...s.debts[0], cents: 75000 } };
  s = financeReducer(s, adjustment);
  assert.equal(s.debtEvents!.at(-1)?.cents, -5000);
  assert.deepEqual(financeReducer(s, adjustment), s);
});

test('ingresos esperados permiten abonos parciales sin sumar el salario antes de recibirlo', () => {
  let s = start(); s.settings.nextIncomeDate = '2026-11-16'; s.settings.incomeAnchorDay = 16;
  s = financeReducer(s, { type: 'tick', today: date });
  assert.equal(s.expectedIncomes?.length, 2); assert.deepEqual(s.balances, start().balances);
  const id = s.expectedIncomes!.find(e => e.date === '2026-11-16')!.id;
  s = financeReducer(s, { type: 'receive-expected', id, entryId: 'partial', cents: 500000, account: 'bank', date });
  assert.equal(s.expectedIncomes!.find(e => e.id === id)!.receivedCents, 500000); assert.equal(s.balances.bank, 1500000);
  const next = financeReducer(s, { type: 'receive-expected', id, entryId: 'partial', cents: 500000, account: 'bank', date });
  assert.deepEqual(next, s);
  s = financeReducer(s, { type: 'edit-entry', entry: { ...s.entries[0], cents: 400000 }, operationId: 'correct-income', today: date });
  assert.equal(s.balances.bank, 1400000); assert.equal(s.expectedIncomes!.find(e => e.id === id)!.receivedCents, 400000);
  assert.deepEqual(financeReducer(s, { type: 'tick', today: date }).expectedIncomes, s.expectedIncomes);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { available, contributions, demoState, financeReducer, localDate, parseMoney, period, periodLabel, reserved, spendWarning, validDate } from '../src/domain/finance.ts';
const today = '2026-11-17';

test('ofrenda sobre ingreso, configurable y con redondeo a centavos', () => {
  assert.deepEqual(contributions(1400000, 5), { tithe: 140000, offering: 70000 });
  assert.equal(contributions(1400000, 6).offering, 84000);
  assert.equal(contributions(1400000, 0).offering, 0);
  assert.equal(contributions(10001, 5).offering, 500);
  assert.throws(() => contributions(100, -1));
});
test('captura monetaria estricta, sin separadores de miles ni errores de coma flotante', () => {
  assert.equal(parseMoney('100.01'), 10001);
  assert.equal(parseMoney('0,29'), 29);
  for (const value of ['0', '-5', '1e4', '12.345', '1,000.00', 'NaN', '', '.5']) assert.equal(parseMoney(value), null);
});
test('retiro mueve dinero entre banco y cartera sin alterar el total o generar gasto', () => {
  const start = demoState(today);
  const next = financeReducer(start, { type: 'entry', entry: { id: 'transfer', concept: 'Retiro', kind: 'transfer', account: 'bank', cents: 100000, date: today } });
  assert.equal(next.balances.bank, start.balances.bank - 100000);
  assert.equal(next.balances.cash, start.balances.cash + 100000);
  assert.equal(available(next), available(start));
  assert.equal(next.entries.filter(e => e.kind === 'expense').length, 1);
});
test('dinero reservado y disponible distinguen saldo físico de compromisos', () => {
  const state = demoState(today);
  assert.equal(reserved(state), 420000);
  assert.equal(available(state), 932000);
  assert.equal(available(state, 'cash'), 252000);
  assert.equal(available(state, 'bank'), 680000);
});
test('entrega libera reserva y descuenta una sola salida, sin doble descuento del disponible', () => {
  const state = demoState(today);
  const action = { type: 'deliver' as const, id: 'tithe', entryId: 'delivery', date: today };
  const next = financeReducer(state, action);
  assert.equal(next.balances.bank, state.balances.bank - 140000);
  assert.equal(reserved(next), reserved(state) - 140000);
  assert.equal(available(next), available(state));
  assert.strictEqual(financeReducer(next, action), next);
  assert.strictEqual(financeReducer(next, { ...action, entryId: 'different' }), next);
});
test('pago reservado no duplica gasto ni descuenta dos veces el disponible', () => {
  const state = demoState(today);
  const action = { type: 'payment' as const, id: 'card', entryId: 'payment', date: today };
  const next = financeReducer(state, action);
  assert.equal(available(next), available(state));
  assert.equal(next.entries[0].cents, 200000);
  assert.strictEqual(financeReducer(next, { ...action, entryId: 'again' }), next);
});
test('pago sin reserva sí reduce el disponible', () => {
  const state = demoState(today);
  const next = financeReducer(state, { type: 'payment', id: 'internet', entryId: 'internet-pay', date: today });
  assert.equal(available(next), available(state) - 35000);
});
test('abono disminuye deuda y dinero juntos; rechaza sobrepago', () => {
  const state = demoState(today);
  const action = { type: 'debt' as const, id: 'music', entryId: 'debt-pay', cents: 20000, account: 'cash' as const, date: today };
  const next = financeReducer(state, action);
  assert.equal(next.debts[0].cents, 30000);
  assert.equal(next.balances.cash, state.balances.cash - 20000);
  assert.equal(next.entries.length, state.entries.length + 1);
  assert.strictEqual(financeReducer(next, action), next);
  assert.throws(() => financeReducer(state, { ...action, cents: 50001 }));
});
test('advertencia permite continuar explícitamente y refleja insuficiencia real', () => {
  const state = demoState(today);
  assert.ok(spendWarning(state, 'bank', 700000));
  assert.equal(spendWarning(state, 'bank', 10000), null);
  assert.equal(spendWarning(state, 'bank', 200000, 200000), null);
  const next = financeReducer(state, { type: 'entry', entry: { id: 'override', kind: 'expense', concept: 'Gasto confirmado', cents: 1200000, account: 'bank', date: today } });
  assert.equal(next.balances.bank, -100000);
  assert.equal(available(next, 'bank'), -520000);
});
test('cambiar ingreso esperado y porcentaje no modifica movimientos ni apartados existentes', () => {
  const state = demoState(today);
  const next = financeReducer(state, { type: 'settings', settings: { salaryCents: 2000000, offeringPercent: 8, frequency: 'monthly' } });
  assert.deepEqual(next.balances, state.balances);
  assert.strictEqual(next.entries, state.entries);
  assert.strictEqual(next.reserves, state.reserves);
  assert.equal(next.settings.frequency, 'monthly');
});
test('solo confirmar un ingreso aumenta el saldo y la repetición no lo duplica', () => {
  const state = demoState(today);
  const action = { type: 'entry' as const, entry: { id: 'partial-income', kind: 'income' as const, concept: 'Pago parcial', cents: 500000, account: 'bank' as const, date: today } };
  const next = financeReducer(state, action);
  assert.equal(next.balances.bank, state.balances.bank + 500000);
  assert.strictEqual(financeReducer(next, action), next);
});
test('cortes quincenales, años, fechas locales y febrero bisiesto', () => {
  assert.equal(period('2026-11-15'), '2026-11-1');
  assert.equal(period('2026-11-16'), '2026-11-2');
  assert.notEqual(period('2026-12-31'), period('2027-01-01'));
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
  assert.equal(validDate('2026-13-01'), false);
  assert.equal(validDate('2026-2-01'), false);
  assert.equal(localDate(new Date(2026, 10, 17, 23)), today);
  assert.match(periodLabel('2028-02-20'), /16–29/);
});
test('movimientos inválidos no alteran el estado', () => {
  const state = demoState(today);
  const entry = { id: 'invalid', kind: 'expense' as const, concept: 'Prueba', cents: 100, account: 'cash' as const, date: today };
  assert.throws(() => financeReducer(state, { type: 'entry', entry: { ...entry, cents: 1.5 } }));
  assert.throws(() => financeReducer(state, { type: 'entry', entry: { ...entry, date: '2026-02-30' } }));
  assert.throws(() => financeReducer(state, { type: 'entry', entry: { ...entry, concept: ' ' } }));
  assert.equal(state.balances.cash, 252000);
});

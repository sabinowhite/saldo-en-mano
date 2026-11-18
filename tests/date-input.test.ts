import test from 'node:test';
import assert from 'node:assert/strict';
import { dateLabel, pickerDate } from '../src/domain/date-input.ts';
import { localDate } from '../src/domain/finance.ts';
test('calendario conserva el día local en México, incluidos históricos y años bisiestos', () => {
  const timezone = process.env.TZ;
  try {
    process.env.TZ = 'America/Mexico_City';
    for (const value of ['2026-11-16', '2028-02-29', '2000-01-01', '2100-12-31']) {
      assert.equal(localDate(pickerDate(value)), value);
      assert.equal(pickerDate(value).getHours(), 12);
    }
    assert.match(dateLabel('2026-11-16'), /16.*noviembre.*2026/);
  } finally { if (timezone === undefined) delete process.env.TZ; else process.env.TZ = timezone; }
});
test('campo sin fecha ofrece elegir y abre el calendario en el día actual', () => {
  assert.equal(dateLabel(''), 'Elegir fecha');
  assert.equal(localDate(pickerDate('')), localDate());
});

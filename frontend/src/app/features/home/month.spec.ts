import { vi } from 'vitest';

import { currentMonth, firstDay, lastDay, lastMonths, monthShort, monthTitle, shiftMonth } from './month';

describe('month', () => {
  it('usa o fuso local para o mês atual, mesmo na última noite do mês', () => {
    vi.useFakeTimers({ now: new Date(2026, 11, 31, 23, 59), toFake: ['Date'] });
    try {
      expect(currentMonth()).toBe('2026-12');
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['2027-01', -1, '2026-12'],
    ['2026-12', 1, '2027-01'],
    ['2026-03', -5, '2025-10'],
    ['2026-03', 0, '2026-03'],
  ])('%s deslocado em %d vira %s', (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });

  it.each([
    ['2026-01', '2026-01-31'],
    ['2026-02', '2026-02-28'],
    ['2028-02', '2028-02-29'],
    ['2026-11', '2026-11-30'],
    ['2026-12', '2026-12-31'],
  ])('%s vai do dia 1 até %s', (month, last) => {
    expect(firstDay(month)).toBe(`${month}-01`);
    expect(lastDay(month)).toBe(last);
  });

  it('lista os últimos meses a partir do informado, atravessando o ano', () => {
    expect(lastMonths('2027-01', 3)).toEqual(['2027-01', '2026-12', '2026-11']);
  });

  it('escreve em português', () => {
    expect(monthTitle('2026-03')).toBe('março de 2026');
    expect(monthShort('2026-11')).toBe('nov');
  });
});

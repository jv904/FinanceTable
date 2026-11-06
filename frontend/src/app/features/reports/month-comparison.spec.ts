import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MonthComparison } from './month-comparison';
import { Report } from './report.service';

registerLocaleData(localePt);

const API = '/api/reports';

function report(income: number, expense: number): Report {
  return { from: '', to: '', income, expense, result: income - expense, expensesByCategory: [], months: [] };
}

describe('MonthComparison', () => {
  let fixture: ComponentFixture<MonthComparison>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const text = () => element.textContent!.replace(/\s+/g, ' ');

  function respond(from: string, body: Report): void {
    http.expectOne((r) => r.url === API && r.params.get('from') === from).flush(body);
  }

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date(2027, 0, 15), toFake: ['Date'] });
    TestBed.configureTestingModule({
      imports: [MonthComparison],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'pt-BR' }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MonthComparison);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('compara o mês atual com o anterior, atravessando o ano', async () => {
    const current = http.expectOne((r) => r.url === API && r.params.get('from') === '2027-01-01');
    expect(current.request.params.get('to')).toBe('2027-01-31');
    current.flush(report(2000, 500));
    const previous = http.expectOne((r) => r.url === API && r.params.get('from') === '2026-12-01');
    expect(previous.request.params.get('to')).toBe('2026-12-31');
    previous.flush(report(1000, 800));
    await fixture.whenStable();

    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) => row.textContent!.replace(/\s+/g, ' '));
    expect(rows[0]).toMatch(/Receitas.*R\$\s2\.000,00.*R\$\s1\.000,00.*\+R\$\s1\.000,00/);
    expect(rows[1]).toMatch(/Despesas.*R\$\s500,00.*R\$\s800,00.*-R\$\s300,00/);
    expect(rows[2]).toMatch(/Resultado.*R\$\s1\.500,00.*R\$\s200,00.*\+R\$\s1\.300,00/);
    expect(text()).toContain('janeiro de 2027 menos dezembro de 2026');
  });

  it('não mostra resíduo de ponto flutuante na diferença', async () => {
    respond('2027-01-01', report(0.3, 0));
    respond('2026-12-01', report(0.1, 0));
    await fixture.whenStable();

    expect(element.querySelector('tbody tr')!.textContent).toMatch(/\+R\$\s0,20/);
  });

  it('se a consulta falhar, mostra o erro neste bloco e permite tentar de novo', async () => {
    http
      .expectOne((r) => r.params.get('from') === '2027-01-01')
      .flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Erro' });
    // forkJoin cancela a outra consulta assim que a primeira falha.
    http.match((r) => r.params.get('from') === '2026-12-01');
    await fixture.whenStable();

    expect(element.querySelector('[role=alert]')!.textContent).toContain('Falhou.');

    element.querySelector<HTMLButtonElement>('button[matButton]')!.click();
    respond('2027-01-01', report(1, 0));
    respond('2026-12-01', report(1, 0));
    await fixture.whenStable();

    expect(element.querySelector('[role=alert]')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
  });
});

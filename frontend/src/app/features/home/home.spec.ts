import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { NotificationService } from '../../core/notifications/notification.service';
import { Home } from './home';
import { Summary } from './summary.service';

registerLocaleData(localePt);

const API = '/api/summary';
const SUMMARY: Summary = {
  balance: 1500,
  income: 2000,
  expense: 500,
  result: 1500,
  expensesByCategory: [{ categoryId: 'c2', name: 'Alimentação', amount: 500 }],
  monthlyExpenses: [
    { month: '2026-08', amount: 0 },
    { month: '2026-09', amount: 0 },
    { month: '2026-10', amount: 0 },
    { month: '2026-11', amount: 0 },
    { month: '2026-12', amount: 0 },
    { month: '2027-01', amount: 500 },
  ],
  recent: [
    {
      id: 't1',
      description: 'Mercado',
      amount: 500,
      type: 'EXPENSE',
      categoryId: 'c2',
      categoryName: 'Alimentação',
      occurredOn: '2027-01-10',
      createdAt: '2027-01-10T12:00:00Z',
    },
  ],
};

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const open = vi.fn();

  beforeEach(async () => {
    open.mockReset();
    vi.useFakeTimers({ now: new Date(2027, 0, 15), toFake: ['Date'] });
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: MatDialog, useValue: { open } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Home);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  const text = () => element.textContent!.replace(/\s+/g, ' ');

  function monthRequested(): string {
    const request = http.expectOne((r) => r.url === API);
    const month = request.request.params.get('month')!;
    request.flush(SUMMARY);
    return month;
  }

  async function respond(summary: Summary = SUMMARY): Promise<void> {
    http.expectOne((r) => r.url === API).flush(summary);
    await fixture.whenStable();
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll('button')).find((item) => item.textContent!.includes(label))!;
  }

  function byLabel(label: string): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  }

  it('consulta o mês atual e mostra saldo, totais e últimas movimentações', async () => {
    expect(text()).toContain('Carregando resumo...');
    const request = http.expectOne((r) => r.url === API);
    expect(request.request.params.get('month')).toBe('2027-01');
    request.flush(SUMMARY);
    await fixture.whenStable();

    expect(text()).toMatch(/Saldo atual\s*R\$\s1\.500,00/);
    expect(text()).toMatch(/Receitas do mês\s*R\$\s2\.000,00/);
    expect(text()).toMatch(/Despesas do mês\s*R\$\s500,00/);
    expect(text()).toMatch(/Diferença do mês\s*R\$\s1\.500,00/);
    expect(text()).toContain('janeiro de 2027');
    expect(text()).toContain('Mercado');
    expect(text()).toContain('10/01/2027 · Alimentação · Despesa');
    expect(text()).toMatch(/− R\$\s500,00/);
  });

  it('mostra saldo negativo', async () => {
    await respond({ ...SUMMARY, balance: -50.25 });

    expect(text()).toMatch(/Saldo atual\s*-R\$\s50,25/);
  });

  it('atravessa a virada do ano e volta ao mês atual', async () => {
    await respond();
    expect(button('Mês atual')).toBeUndefined();

    byLabel('Mês anterior').click();
    expect(monthRequested()).toBe('2026-12');
    await fixture.whenStable();
    expect(text()).toContain('dezembro de 2026');
    expect(button('Mês atual')).toBeDefined();

    button('Mês atual').click();
    expect(monthRequested()).toBe('2027-01');
    await fixture.whenStable();
    expect(button('Mês atual')).toBeUndefined();

    byLabel('Próximo mês').click();
    expect(monthRequested()).toBe('2027-02');
  });

  it('ao trocar de mês, mantém os dados anteriores esmaecidos até a resposta chegar', async () => {
    await respond();

    byLabel('Mês anterior').click();
    await fixture.whenStable();

    expect(text()).toContain('Saldo atual');
    expect(element.querySelector('.content')!.classList).toContain('stale');

    await respond({ ...SUMMARY, income: 111 });
    expect(element.querySelector('.content')!.classList).not.toContain('stale');
    expect(text()).toMatch(/Receitas do mês\s*R\$\s111,00/);
  });

  it('uma resposta antiga não substitui a do mês mais novo', async () => {
    await respond();

    byLabel('Mês anterior').click();
    const old = http.expectOne((r) => r.url === API);
    byLabel('Mês anterior').click();
    const newest = http.expectOne((r) => r.url === API);

    expect(old.cancelled).toBe(true);
    expect(newest.request.params.get('month')).toBe('2026-11');
    newest.flush(SUMMARY);
  });

  it('em caso de erro, mostra a mensagem e permite tentar de novo', async () => {
    http.expectOne((r) => r.url === API).flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(text()).toContain('Falhou.');

    button('Tentar novamente').click();
    await respond();

    expect(text()).not.toContain('Falhou.');
    expect(text()).toContain('Saldo atual');
  });

  it('em conta sem dados, avisa em cada bloco', async () => {
    await respond({
      ...SUMMARY,
      balance: 0,
      income: 0,
      expense: 0,
      result: 0,
      expensesByCategory: [],
      monthlyExpenses: SUMMARY.monthlyExpenses.map((month) => ({ ...month, amount: 0 })),
      recent: [],
    });

    expect(text()).toMatch(/Saldo atual\s*R\$\s0,00/);
    expect(text()).toContain('Nenhuma movimentação neste mês.');
    expect(text()).toContain('Nenhuma despesa neste mês.');
    expect(text()).toContain('Nenhuma despesa nos últimos 6 meses.');
    expect(text()).toContain('Nenhuma movimentação encontrada.');
  });

  it('cadastrar pelo início abre o formulário com categorias novas e recarrega o resumo', async () => {
    await respond();
    open.mockReturnValue({ afterClosed: () => of(SUMMARY.recent[0]) });

    button('Nova despesa').click();
    const categories = [{ id: 'c2', name: 'Alimentação', type: 'EXPENSE' }];
    http.expectOne('/api/categories').flush(categories);

    expect(open.mock.calls[0][1].data).toEqual({ type: 'EXPENSE', categories });
    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Movimentação salva com sucesso!');
    await respond();
  });

  it('se o formulário for cancelado, não recarrega', async () => {
    await respond();
    open.mockReturnValue({ afterClosed: () => of(undefined) });

    button('Nova receita').click();
    http.expectOne('/api/categories').flush([]);

    expect(open).toHaveBeenCalledOnce();
    http.expectNone((r) => r.url === API);
  });

  it('se as categorias falharem, avisa e não abre o formulário', async () => {
    await respond();

    button('Nova receita').click();
    http.expectOne('/api/categories').flush({ detail: 'Sem categorias.' }, { status: 500, statusText: 'Error' });

    expect(open).not.toHaveBeenCalled();
    expect(TestBed.inject(NotificationService).error).toHaveBeenCalledWith('Sem categorias.');
  });
});

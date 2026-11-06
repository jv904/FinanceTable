import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { NotificationService } from '../../core/notifications/notification.service';
import { TransactionPage } from '../transactions/transaction.service';
import { Report } from './report.service';
import { Reports } from './reports';

registerLocaleData(localePt);

const REPORTS = '/api/reports';
const EXPORT = '/api/reports/export';
const TRANSACTIONS = '/api/transactions';

const REPORT: Report = {
  from: '2027-01-01',
  to: '2027-01-31',
  income: 2000,
  expense: 500,
  result: 1500,
  expensesByCategory: [{ categoryId: 'c2', name: 'Alimentação', amount: 500 }],
  months: [{ month: '2027-01', income: 2000, expense: 500, result: 1500 }],
};

const HISTORY: TransactionPage = {
  content: [
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
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const EMPTY_HISTORY: TransactionPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const notifications = { success: vi.fn(), error: vi.fn() };

  const text = () => element.textContent!.replace(/\s+/g, ' ');
  const exportButton = () => element.querySelector<HTMLButtonElement>('.title button')!;

  /** A comparação de meses tem consultas próprias, identificadas aqui por pedirem meses inteiros em pares. */
  function answerComparison(): void {
    http.expectOne((r) => r.url === REPORTS && r.params.get('from') === '2026-12-01').flush(REPORT);
  }

  function reportRequest(from: string): TestRequest {
    return http.expectOne((r) => r.url === REPORTS && r.params.get('from') === from);
  }

  function historyRequest(): TestRequest {
    return http.expectOne((r) => r.url === TRANSACTIONS);
  }

  /** Atende a primeira carga: o mês atual aparece no relatório e na comparação. */
  async function load(history = HISTORY): Promise<void> {
    http.match((r) => r.url === REPORTS && r.params.get('from') === '2027-01-01').forEach((r) => r.flush(REPORT));
    answerComparison();
    historyRequest().flush(history);
    await fixture.whenStable();
  }

  async function choosePeriodMode(): Promise<void> {
    const toggle = Array.from(element.querySelectorAll<HTMLButtonElement>('mat-button-toggle button')).find((button) =>
      button.textContent!.includes('Período'),
    )!;
    toggle.click();
    await fixture.whenStable();
  }

  async function typeDates(from: string, to: string): Promise<void> {
    const [start, end] = Array.from(element.querySelectorAll<HTMLInputElement>('input[type=date]'));
    start.value = from;
    start.dispatchEvent(new Event('input'));
    end.value = to;
    end.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    notifications.error.mockReset();
    // O debounceTime agenda com setInterval.
    vi.useFakeTimers({ now: new Date(2027, 0, 15), toFake: ['Date', 'setInterval', 'clearInterval'] });
    TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Reports);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
    vi.restoreAllMocks();
  });

  it('começa pelo mês atual e mostra totais, categorias e histórico', async () => {
    const requests = http.match((r) => r.url === REPORTS && r.params.get('from') === '2027-01-01');
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].request.params.get('to')).toBe('2027-01-31');
    requests.forEach((request) => request.flush(REPORT));
    answerComparison();
    const history = historyRequest();
    expect(history.request.params.get('from')).toBe('2027-01-01');
    expect(history.request.params.get('to')).toBe('2027-01-31');
    history.flush(HISTORY);
    await fixture.whenStable();

    expect(text()).toContain('janeiro de 2027');
    expect(text()).toMatch(/Resultado\s*R\$\s1\.500,00/);
    expect(text()).toContain('Maiores despesas por categoria');
    expect(text()).toContain('Alimentação');
    expect(text()).toContain('Mercado');
    expect(text()).toContain('10/01/2027');
  });

  it('com um único mês, não repete os totais na evolução', async () => {
    await load();

    expect(text()).not.toContain('Evolução no período');
    expect(element.querySelector('app-expense-trend')).toBeNull();
  });

  it('as setas consultam o mês vizinho', async () => {
    await load();

    element.querySelector<HTMLButtonElement>('[aria-label="Mês anterior"]')!.click();
    await fixture.whenStable();

    const report = reportRequest('2026-12-01');
    expect(report.request.params.get('to')).toBe('2026-12-31');
    report.flush(REPORT);
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    expect(text()).toContain('dezembro de 2026');
    expect(text()).toContain('Mês atual');
  });

  it('consulta um período personalizado e desenha a evolução', async () => {
    await load();
    await choosePeriodMode();
    reportRequest('2027-01-01').flush(REPORT);
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    await typeDates('2026-11-15', '2027-01-10');

    const request = reportRequest('2026-11-15');
    expect(request.request.params.get('to')).toBe('2027-01-10');
    request.flush({
      ...REPORT,
      months: [
        { month: '2026-11', income: 0, expense: 100, result: -100 },
        { month: '2026-12', income: 0, expense: 200, result: -200 },
        { month: '2027-01', income: 0, expense: 300, result: -300 },
      ],
    });
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    expect(element.querySelector('app-expense-trend')).not.toBeNull();
    expect(element.querySelectorAll('app-expense-trend circle')).toHaveLength(3);
  });

  it('acima de 12 meses, deixa só a tabela', async () => {
    await load();
    await choosePeriodMode();
    reportRequest('2027-01-01').flush(REPORT);
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    await typeDates('2025-01-01', '2026-01-31');

    const months = Array.from({ length: 13 }, (_, index) => ({
      month: index === 12 ? '2026-01' : `2025-${String(index + 1).padStart(2, '0')}`,
      income: 0,
      expense: 10,
      result: -10,
    }));
    reportRequest('2025-01-01').flush({ ...REPORT, months });
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    expect(element.querySelector('app-expense-trend')).toBeNull();
    expect(element.querySelectorAll('.wide tbody tr')).toHaveLength(13);
  });

  it('com datas invertidas, explica e não consulta nem deixa exportar', async () => {
    await load();
    await choosePeriodMode();
    reportRequest('2027-01-01').flush(REPORT);
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    await typeDates('2027-02-01', '2027-01-01');

    expect(element.querySelector('[role=alert]')!.textContent).toContain(
      'A data inicial não pode ser posterior à data final.',
    );
    expect(exportButton().disabled).toBe(true);
  });

  it('com uma data vazia, pede as duas', async () => {
    await load();
    await choosePeriodMode();
    reportRequest('2027-01-01').flush(REPORT);
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    await typeDates('', '2027-01-31');

    expect(element.querySelector('[role=alert]')!.textContent).toContain('Preencha as duas datas do período.');
  });

  it('mostra a mensagem do backend e permite tentar de novo', async () => {
    http.match((r) => r.url === REPORTS && r.params.get('from') === '2027-01-01')[0].flush(
      { detail: 'Escolha um período de até 5 anos.' },
      { status: 400, statusText: 'Bad Request' },
    );
    http.match((r) => r.url === REPORTS && r.params.get('from') === '2027-01-01').forEach((r) => r.flush(REPORT));
    answerComparison();
    historyRequest().flush(HISTORY);
    await fixture.whenStable();

    expect(text()).toContain('Escolha um período de até 5 anos.');

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent!.includes('Tentar novamente'))!
      .click();
    reportRequest('2027-01-01').flush(REPORT);
    await fixture.whenStable();

    expect(text()).toMatch(/Resultado\s*R\$\s1\.500,00/);
  });

  it('pagina o histórico e volta à primeira página ao trocar de mês', async () => {
    await load({ ...HISTORY, totalElements: 40, totalPages: 2 });
    expect(text()).toContain('Página 1 de 2');

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent!.includes('Próxima'))!
      .click();
    const second = historyRequest();
    expect(second.request.params.get('page')).toBe('1');
    second.flush({ ...HISTORY, page: 1, totalElements: 40, totalPages: 2 });
    await fixture.whenStable();
    expect(text()).toContain('Página 2 de 2');

    element.querySelector<HTMLButtonElement>('[aria-label="Mês anterior"]')!.click();
    await fixture.whenStable();
    reportRequest('2026-12-01').flush(REPORT);
    const first = historyRequest();
    expect(first.request.params.get('page')).toBe('0');
    first.flush(HISTORY);
    await fixture.whenStable();
  });

  it('sem movimentações, avisa e não deixa exportar', async () => {
    await load(EMPTY_HISTORY);

    expect(text()).toContain('Nenhuma movimentação encontrada.');
    expect(exportButton().disabled).toBe(true);
  });

  describe('exportação', () => {
    let click: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      URL.createObjectURL = vi.fn(() => 'blob:relatorio');
      URL.revokeObjectURL = vi.fn();
    });

    it('baixa o arquivo do período consultado e desativa o botão enquanto isso', async () => {
      await load();

      exportButton().click();
      await fixture.whenStable();
      expect(exportButton().disabled).toBe(true);
      expect(text()).toContain('Exportando...');

      const request = http.expectOne((r) => r.url === EXPORT);
      expect(request.request.params.get('from')).toBe('2027-01-01');
      expect(request.request.params.get('to')).toBe('2027-01-31');
      request.flush(new Blob(['csv']));
      await fixture.whenStable();

      const link = click.mock.instances[0] as unknown as HTMLAnchorElement;
      expect(link.download).toBe('movimentacoes-2027-01-01-a-2027-01-31.csv');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');
      expect(exportButton().disabled).toBe(false);
    });

    it('se falhar, avisa e libera o botão', async () => {
      await load();

      exportButton().click();
      http.expectOne((r) => r.url === EXPORT).flush(new Blob(['erro']), { status: 500, statusText: 'Erro' });
      await fixture.whenStable();

      expect(notifications.error).toHaveBeenCalledWith('Não foi possível exportar. Tente novamente.');
      expect(click).not.toHaveBeenCalled();
      expect(exportButton().disabled).toBe(false);
    });
  });
});

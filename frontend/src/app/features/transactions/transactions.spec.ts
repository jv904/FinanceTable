import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { NotificationService } from '../../core/notifications/notification.service';
import { Category } from '../categories/category.service';
import { Transactions } from './transactions';
import { Transaction, TransactionPage } from './transaction.service';

registerLocaleData(localePt);

const API = '/api/transactions';
const FOOD: Category = { id: 'c2', name: 'Alimentação', type: 'EXPENSE' };
const INCOME: Transaction = {
  id: 't1',
  description: 'Pagamento',
  amount: 2000,
  type: 'INCOME',
  categoryId: 'c1',
  categoryName: 'Salário',
  occurredOn: '2026-03-31',
  createdAt: '2026-03-31T12:00:00Z',
};
const EXPENSE: Transaction = {
  id: 't2',
  description: 'Mercado',
  amount: 1250.5,
  type: 'EXPENSE',
  categoryId: 'c2',
  categoryName: 'Alimentação',
  occurredOn: '2026-03-01',
  createdAt: '2026-03-01T12:00:00Z',
};

function pageOf(content: Transaction[], page = 0, totalPages = 1): TransactionPage {
  return { content, page, size: 20, totalElements: content.length, totalPages };
}

describe('Transactions', () => {
  let fixture: ComponentFixture<Transactions>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const open = vi.fn();

  beforeEach(async () => {
    open.mockReset();
    TestBed.configureTestingModule({
      imports: [Transactions],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: MatDialog, useValue: { open } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Transactions);
    element = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/categories').flush([FOOD]);
  });

  afterEach(() => http.verify());

  async function respond(page: TransactionPage): Promise<void> {
    http.expectOne((r) => r.url === API).flush(page);
    await fixture.whenStable();
  }

  const text = () => element.textContent!.replace(/\s+/g, ' ');
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function button(label: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll('button')).find((item) => item.textContent!.includes(label))!;
  }

  function dialogReturns(result: unknown): void {
    open.mockReturnValue({ afterClosed: () => of(result) });
  }

  function click(label: string): void {
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
  }

  it('mostra o carregamento e depois a lista, com valor em reais e data no formato brasileiro', async () => {
    expect(text()).toContain('Carregando movimentações...');

    await respond(pageOf([INCOME, EXPENSE]));

    expect(text()).not.toContain('Carregando movimentações...');
    expect(text()).toContain('Mercado');
    expect(text()).toMatch(/− R\$\s1\.250,50/);
    expect(text()).toMatch(/\+ R\$\s2\.000,00/);
    expect(text()).toContain('31/03/2026 · Salário · Receita');
    expect(text()).toContain('01/03/2026 · Alimentação · Despesa');
  });

  it('avisa quando não há movimentações', async () => {
    await respond(pageOf([]));

    expect(text()).toContain('Nenhuma movimentação encontrada.');
  });

  it('em caso de erro, mostra a mensagem e permite tentar de novo', async () => {
    http.expectOne((r) => r.url === API).flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(text()).toContain('Falhou.');

    button('Tentar novamente').click();
    await respond(pageOf([EXPENSE]));

    expect(text()).not.toContain('Falhou.');
    expect(text()).toContain('Mercado');
  });

  it('se as categorias falharem, avisa e tenta buscá-las de novo', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Transactions],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Transactions);
    element = fixture.nativeElement;
    await fixture.whenStable();

    http.expectOne((r) => r.url === API).flush(pageOf([]));
    http.expectOne('/api/categories').flush({ detail: 'Sem categorias.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(text()).toContain('Sem categorias.');

    button('Tentar novamente').click();
    http.expectOne((r) => r.url === API).flush(pageOf([]));
    http.expectOne('/api/categories').flush([FOOD]);
    await fixture.whenStable();

    expect(text()).not.toContain('Sem categorias.');
    expect(fixture.componentInstance['sortedCategories']()).toEqual([FOOD]);
  });

  it('ao filtrar, volta para a primeira página e envia os filtros', async () => {
    await respond(pageOf([EXPENSE], 0, 3));
    button('Próxima').click();
    await respond(pageOf([EXPENSE], 1, 3));

    fixture.componentInstance['filters'].patchValue({ search: 'mer', type: 'EXPENSE' });
    await wait(350);

    const { params } = http.expectOne((r) => r.url === API).request;
    expect(params.get('page')).toBe('0');
    expect(params.get('search')).toBe('mer');
    expect(params.get('type')).toBe('EXPENSE');
    http.match(() => true).forEach((request) => request.flush(pageOf([])));
  });

  it('uma resposta antiga não substitui a mais nova', async () => {
    const first = http.expectOne((r) => r.url === API);

    fixture.componentInstance['filters'].patchValue({ search: 'novo' });
    await wait(350);

    const second = http.expectOne((r) => r.url === API);
    expect(first.cancelled).toBe(true);
    second.flush(pageOf([INCOME]));
    await fixture.whenStable();

    expect(text()).toContain('Pagamento');
  });

  it('recusa período invertido sem chamar a API', async () => {
    await respond(pageOf([EXPENSE]));

    fixture.componentInstance['filters'].patchValue({ from: '2026-04-01', to: '2026-03-01' });
    await wait(350);
    await fixture.whenStable();

    http.expectNone((r) => r.url === API);
    expect(text()).toContain('A data inicial não pode ser posterior à data final.');
    expect(text()).not.toContain('Mercado');
  });

  it('limpar filtros zera os campos e consulta de novo', async () => {
    await respond(pageOf([]));
    fixture.componentInstance['filters'].patchValue({ search: 'x' });
    button('Limpar filtros').click();
    await wait(350);

    const { params } = http.expectOne((r) => r.url === API).request;
    expect(params.has('search')).toBe(false);
    http.match(() => true).forEach((request) => request.flush(pageOf([])));
  });

  it('pagina a lista e desativa os botões nas pontas', async () => {
    await respond(pageOf([EXPENSE], 0, 2));
    expect(text()).toContain('Página 1 de 2');
    expect(button('Anterior').disabled).toBe(true);

    button('Próxima').click();
    expect(http.expectOne((r) => r.url === API).request.params.get('page')).toBe('1');
    http.match(() => true).forEach((request) => request.flush(pageOf([EXPENSE], 1, 2)));
  });

  it('não mostra a paginação quando há só uma página', async () => {
    await respond(pageOf([EXPENSE]));

    expect(text()).not.toContain('Página 1');
  });

  it('abre o formulário com o tipo do botão e recarrega depois de salvar', async () => {
    await respond(pageOf([]));
    dialogReturns(EXPENSE);

    button('Nova despesa').click();

    expect(open.mock.calls[0][1].data).toEqual({ type: 'EXPENSE', categories: [FOOD] });
    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Movimentação salva com sucesso!');
    await respond(pageOf([EXPENSE]));
    expect(text()).toContain('Mercado');
  });

  it('ao editar, passa a movimentação para o formulário', async () => {
    await respond(pageOf([EXPENSE]));
    dialogReturns(undefined);

    click('Editar Mercado');

    expect(open.mock.calls[0][1].data).toEqual({ type: 'EXPENSE', categories: [FOOD], transaction: EXPENSE });
    http.expectNone((r) => r.url === API);
  });

  it('ao excluir a última linha de uma página, volta para a anterior', async () => {
    await respond(pageOf([EXPENSE], 0, 2));
    button('Próxima').click();
    await respond(pageOf([INCOME], 1, 2));
    dialogReturns(true);

    click('Excluir Pagamento');

    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Movimentação excluída com sucesso!');
    const request = http.expectOne((r) => r.url === API);
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pageOf([EXPENSE]));
  });

  it('se o diálogo de exclusão for cancelado, nada muda', async () => {
    await respond(pageOf([EXPENSE]));
    dialogReturns(undefined);

    click('Excluir Mercado');

    http.expectNone((r) => r.url === API);
    expect(TestBed.inject(NotificationService).success).not.toHaveBeenCalled();
  });
});

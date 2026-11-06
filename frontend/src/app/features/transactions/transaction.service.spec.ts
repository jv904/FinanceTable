import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TransactionData, TransactionFilters, TransactionService } from './transaction.service';

const NO_FILTERS: TransactionFilters = { search: '', type: '', categoryId: '', from: '', to: '' };
const DATA: TransactionData = {
  description: 'Mercado',
  amount: 150,
  type: 'EXPENSE',
  categoryId: 'c1',
  occurredOn: '2026-03-15',
};

describe('TransactionService', () => {
  let service: TransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sem filtros, envia só a página', () => {
    service.list(NO_FILTERS, 2).subscribe();

    const request = http.expectOne((r) => r.url === '/api/transactions').request;
    expect(request.params.keys()).toEqual(['page']);
    expect(request.params.get('page')).toBe('2');
  });

  it('envia apenas os filtros preenchidos, sem espaços nas pontas', () => {
    service.list({ ...NO_FILTERS, search: '  mercado ', type: 'EXPENSE', from: '2026-03-01', to: '   ' }, 0).subscribe();

    const { params } = http.expectOne((r) => r.url === '/api/transactions').request;
    expect(params.get('search')).toBe('mercado');
    expect(params.get('type')).toBe('EXPENSE');
    expect(params.get('from')).toBe('2026-03-01');
    expect(params.has('to')).toBe(false);
    expect(params.has('categoryId')).toBe(false);
  });

  it('cria, edita e exclui nas rotas certas', () => {
    service.create(DATA).subscribe();
    const created = http.expectOne('/api/transactions').request;
    expect(created.method).toBe('POST');
    expect(created.body).toEqual(DATA);

    service.update('t1', DATA).subscribe();
    expect(http.expectOne('/api/transactions/t1').request.method).toBe('PUT');

    service.remove('t1').subscribe();
    expect(http.expectOne('/api/transactions/t1').request.method).toBe('DELETE');
  });
});

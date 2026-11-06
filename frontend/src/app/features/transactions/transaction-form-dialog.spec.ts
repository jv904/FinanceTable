import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { Category } from '../categories/category.service';
import { TransactionFormData, TransactionFormDialog } from './transaction-form-dialog';
import { Transaction } from './transaction.service';

const SALARY: Category = { id: 'c1', name: 'Salário', type: 'INCOME' };
const FOOD: Category = { id: 'c2', name: 'Alimentação', type: 'EXPENSE' };
const EXISTING: Transaction = {
  id: 't1',
  description: 'Mercado',
  amount: 1250.5,
  type: 'EXPENSE',
  categoryId: 'c2',
  categoryName: 'Alimentação',
  occurredOn: '2026-03-15',
  createdAt: '2026-03-16T12:00:00Z',
};

describe('TransactionFormDialog', () => {
  let fixture: ComponentFixture<TransactionFormDialog>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const close = vi.fn();

  async function setup(data: Partial<TransactionFormData> = {}): Promise<void> {
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [TransactionFormDialog],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { type: 'EXPENSE', categories: [SALARY, FOOD], ...data } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TransactionFormDialog);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  const form = () => fixture.componentInstance['form'];
  const options = () => fixture.componentInstance['options']();

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function fillValid(): Promise<void> {
    form().patchValue({ description: '  Mercado ', amount: '1.250,50', categoryId: 'c2', occurredOn: '2026-03-15' });
    await fixture.whenStable();
  }

  it('começa com o tipo pedido e a data de hoje, no fuso local', async () => {
    vi.useFakeTimers({ now: new Date(2026, 0, 5, 23, 30), toFake: ['Date'] });
    try {
      await setup();
    } finally {
      vi.useRealTimers();
    }

    expect(form().getRawValue().type).toBe('EXPENSE');
    expect(form().getRawValue().occurredOn).toBe('2026-01-05');
  });

  it('com campos vazios, avisa e não chama a API', async () => {
    await setup();
    await submit();

    expect(element.textContent).toContain('Preencha todos os campos obrigatórios.');
    http.expectNone('/api/transactions');
  });

  it.each([
    ['0', 'Informe um valor maior que zero.'],
    ['abc', 'Informe um valor válido, como 1.250,50.'],
  ])('com o valor "%s", explica o problema e não chama a API', async (amount, message) => {
    await setup();
    await fillValid();
    form().patchValue({ amount });
    await submit();

    expect(element.textContent).toContain(message);
    http.expectNone('/api/transactions');
  });

  it('com descrição só de espaços, não chama a API', async () => {
    await setup();
    await fillValid();
    form().patchValue({ description: '   ' });
    await submit();

    http.expectNone('/api/transactions');
  });

  it('oferece só as categorias do tipo escolhido e limpa a categoria ao trocar de tipo', async () => {
    await setup();
    await fillValid();
    expect(options()).toEqual([FOOD]);

    form().controls.type.setValue('INCOME');
    await fixture.whenStable();

    expect(options()).toEqual([SALARY]);
    expect(form().getRawValue().categoryId).toBe('');
  });

  it('avisa quando não há categorias do tipo escolhido', async () => {
    await setup({ categories: [SALARY] });

    expect(element.textContent).toContain('Não há categorias deste tipo.');
    expect(element.querySelector('a[href="/categorias"]')).not.toBeNull();
  });

  it('ao criar, envia o valor como número e fecha com o resultado', async () => {
    await setup();
    await fillValid();
    await submit();

    const request = http.expectOne('/api/transactions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      type: 'EXPENSE',
      description: 'Mercado',
      amount: 1250.5,
      categoryId: 'c2',
      occurredOn: '2026-03-15',
    });
    request.flush(EXISTING, { status: 201, statusText: 'Created' });

    expect(close).toHaveBeenCalledWith(EXISTING);
  });

  it('ao editar, traz os dados atuais e usa a rota da movimentação', async () => {
    await setup({ transaction: EXISTING });

    expect(element.textContent).toContain('Editar movimentação');
    expect(element.textContent).toContain('Cadastrada em');
    expect(form().getRawValue()).toEqual({
      type: 'EXPENSE',
      description: 'Mercado',
      amount: '1.250,50',
      categoryId: 'c2',
      occurredOn: '2026-03-15',
    });

    await submit();

    const request = http.expectOne('/api/transactions/t1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.amount).toBe(1250.5);
    request.flush(EXISTING);
    expect(close).toHaveBeenCalledWith(EXISTING);
  });

  it('mostra a mensagem do backend e continua aberto em caso de recusa', async () => {
    await setup();
    await fillValid();
    await submit();

    http
      .expectOne('/api/transactions')
      .flush({ detail: 'Categoria não encontrada.' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(element.textContent).toContain('Categoria não encontrada.');
    expect(close).not.toHaveBeenCalled();
  });

  it('em falha do servidor, usa a mensagem do manual', async () => {
    await setup();
    await fillValid();
    await submit();

    http.expectOne('/api/transactions').flush({ detail: 'Erro interno' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(element.textContent).toContain('Não foi possível salvar. Tente novamente.');
    expect(close).not.toHaveBeenCalled();
  });
});

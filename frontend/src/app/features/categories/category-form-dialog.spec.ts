import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';

import { CategoryFormData, CategoryFormDialog } from './category-form-dialog';
import { Category } from './category.service';

const SALARY: Category = { id: '1', name: 'Salário', type: 'INCOME' };

describe('CategoryFormDialog', () => {
  let fixture: ComponentFixture<CategoryFormDialog>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const close = vi.fn();

  async function setup(data: CategoryFormData): Promise<void> {
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [CategoryFormDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CategoryFormDialog);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  function typeName(value: string): void {
    const input = element.querySelector<HTMLInputElement>('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('com nome vazio, avisa e não chama a API', async () => {
    await setup({ type: 'INCOME' });
    await submit();

    expect(element.textContent).toContain('Preencha todos os campos obrigatórios.');
    http.expectNone('/api/categories');
  });

  it('com nome só de espaços, não chama a API', async () => {
    await setup({ type: 'INCOME' });
    typeName('    ');
    await submit();

    http.expectNone('/api/categories');
  });

  it('ao criar, envia nome sem espaços nas pontas e o tipo, e fecha com o resultado', async () => {
    await setup({ type: 'EXPENSE' });
    expect(element.textContent).toContain('Nova categoria de despesa');
    typeName('  Pets ');
    await submit();

    const created = { id: '9', name: 'Pets', type: 'EXPENSE' };
    const request = http.expectOne('/api/categories');
    expect(request.request.body).toEqual({ name: 'Pets', type: 'EXPENSE' });
    request.flush(created, { status: 201, statusText: 'Created' });

    expect(close).toHaveBeenCalledWith(created);
  });

  it('ao renomear, já traz o nome atual e usa a rota da categoria', async () => {
    await setup({ type: 'INCOME', category: SALARY });
    expect(element.textContent).toContain('Editar categoria');
    expect(element.querySelector('input')!.value).toBe('Salário');

    typeName('Pró-labore');
    await submit();

    const request = http.expectOne('/api/categories/1');
    expect(request.request.method).toBe('PUT');
    request.flush({ ...SALARY, name: 'Pró-labore' });

    expect(close).toHaveBeenCalledWith({ ...SALARY, name: 'Pró-labore' });
  });

  it('mantém o diálogo aberto e mostra a mensagem quando o nome já existe', async () => {
    await setup({ type: 'INCOME' });
    typeName('Salário');
    await submit();

    http
      .expectOne('/api/categories')
      .flush({ detail: 'Já existe uma categoria com este nome.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(element.textContent).toContain('Já existe uma categoria com este nome.');
    expect(close).not.toHaveBeenCalled();
  });
});

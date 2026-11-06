import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { NotificationService } from '../../core/notifications/notification.service';
import { Categories } from './categories';
import { Category } from './category.service';

const SALARY: Category = { id: '1', name: 'Salário', type: 'INCOME' };
const LEISURE: Category = { id: '2', name: 'Lazer', type: 'EXPENSE' };
const FOOD: Category = { id: '3', name: 'Alimentação', type: 'EXPENSE' };

describe('Categories', () => {
  let fixture: ComponentFixture<Categories>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const open = vi.fn();

  beforeEach(async () => {
    open.mockReset();
    TestBed.configureTestingModule({
      imports: [Categories],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Categories);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function respond(categories: Category[]): Promise<void> {
    http.expectOne('/api/categories').flush(categories);
    await fixture.whenStable();
  }

  function names(sectionClass: string): string[] {
    return Array.from(element.querySelectorAll(`section.${sectionClass} .name`)).map((item) => item.textContent!);
  }

  function dialogReturns(result: unknown): void {
    open.mockReturnValue({ afterClosed: () => of(result) });
  }

  function click(label: string): void {
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
  }

  it('mostra o carregamento enquanto a lista não chega', async () => {
    expect(element.textContent).toContain('Carregando categorias...');
    await respond([]);
    expect(element.textContent).not.toContain('Carregando categorias...');
  });

  it('separa as categorias por tipo, em ordem alfabética', async () => {
    await respond([SALARY, LEISURE, FOOD]);

    expect(names('income')).toEqual(['Salário']);
    expect(names('expense')).toEqual(['Alimentação', 'Lazer']);
  });

  it('avisa quando um bloco está vazio', async () => {
    await respond([SALARY]);

    expect(element.querySelector('section.expense')!.textContent).toContain('Nenhuma categoria cadastrada.');
    expect(element.querySelector('section.income')!.textContent).not.toContain('Nenhuma categoria cadastrada.');
  });

  it('em caso de erro, mostra a mensagem e permite tentar de novo', async () => {
    http.expectOne('/api/categories').flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(element.textContent).toContain('Falhou.');

    element.querySelector<HTMLButtonElement>('.load-error button')!.click();
    await respond([SALARY]);

    expect(element.textContent).not.toContain('Falhou.');
    expect(names('income')).toEqual(['Salário']);
  });

  it('abre o formulário do bloco certo e inclui a categoria criada, em ordem', async () => {
    await respond([LEISURE]);
    dialogReturns(FOOD);

    element.querySelector<HTMLButtonElement>('section.expense header button')!.click();
    await fixture.whenStable();

    expect(open.mock.calls[0][1].data).toEqual({ type: 'EXPENSE' });
    expect(names('expense')).toEqual(['Alimentação', 'Lazer']);
    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Categoria salva com sucesso!');
  });

  it('ao renomear, substitui a categoria na lista', async () => {
    await respond([SALARY]);
    dialogReturns({ ...SALARY, name: 'Pró-labore' });

    click('Editar Salário');
    await fixture.whenStable();

    expect(open.mock.calls[0][1].data).toEqual({ type: 'INCOME', category: SALARY });
    expect(names('income')).toEqual(['Pró-labore']);
  });

  it('ao excluir, tira a categoria da lista', async () => {
    await respond([FOOD, LEISURE]);
    dialogReturns(true);

    click('Excluir Lazer');
    await fixture.whenStable();

    expect(names('expense')).toEqual(['Alimentação']);
    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Categoria excluída com sucesso!');
  });

  it('se o diálogo for cancelado, nada muda', async () => {
    await respond([LEISURE]);
    dialogReturns(undefined);

    click('Excluir Lazer');
    await fixture.whenStable();

    expect(names('expense')).toEqual(['Lazer']);
    expect(TestBed.inject(NotificationService).success).not.toHaveBeenCalled();
  });
});

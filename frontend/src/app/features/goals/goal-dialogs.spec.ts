import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';

import { ContributionDialog } from './contribution-dialog';
import { GoalFormDialog } from './goal-form-dialog';
import { Goal } from './goal.service';

const GOAL: Goal = {
  id: 'g1',
  name: 'Notebook',
  targetAmount: 5000,
  savedAmount: 2000.5,
  remainingAmount: 2999.5,
  progressPercent: 40,
  targetDate: '2027-06-30',
};

const close = vi.fn();
let http: HttpTestingController;
let element: HTMLElement;

async function setup<T>(component: Type<T>, data: unknown): Promise<ComponentFixture<T>> {
  close.mockReset();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close } },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(component);
  element = fixture.nativeElement;
  await fixture.whenStable();
  return fixture;
}

function type(name: string, value: string): void {
  const input = element.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function submit(fixture: ComponentFixture<unknown>): Promise<void> {
  element.querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

afterEach(() => http.verify());

describe('GoalFormDialog', () => {
  function fillValid(): void {
    type('name', '  Viagem ');
    type('targetAmount', '5.000,00');
    type('targetDate', '2027-06-30');
  }

  it('com campos vazios, avisa e não chama a API', async () => {
    const fixture = await setup(GoalFormDialog, {});
    await submit(fixture);

    expect(element.textContent).toContain('Preencha todos os campos obrigatórios.');
    http.expectNone('/api/goals');
  });

  it('valor desejado zero é recusado com a mensagem do manual', async () => {
    const fixture = await setup(GoalFormDialog, {});
    fillValid();
    type('targetAmount', '0');
    await submit(fixture);

    expect(element.textContent).toContain('Informe um valor maior que zero.');
    http.expectNone('/api/goals');
  });

  it('valor guardado inválido é recusado', async () => {
    const fixture = await setup(GoalFormDialog, {});
    fillValid();
    type('savedAmount', 'abc');
    await submit(fixture);

    expect(element.textContent).toContain('Informe um valor válido, como 1.250,50.');
    http.expectNone('/api/goals');
  });

  it('valor inicial em branco é enviado como zero, e o nome sem espaços nas pontas', async () => {
    const fixture = await setup(GoalFormDialog, {});
    expect(element.textContent).toContain('Nova meta');
    fillValid();
    await submit(fixture);

    const request = http.expectOne('/api/goals');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Viagem',
      targetAmount: 5000,
      savedAmount: 0,
      targetDate: '2027-06-30',
    });
    request.flush(GOAL, { status: 201, statusText: 'Created' });
    expect(close).toHaveBeenCalledWith(GOAL);
  });

  it('ao editar, traz os dados atuais em formato brasileiro e usa a rota da meta', async () => {
    const fixture = await setup(GoalFormDialog, { goal: GOAL });

    expect(element.textContent).toContain('Editar meta');
    expect(element.textContent).toContain('Valor já guardado');
    expect(element.querySelector<HTMLInputElement>('input[formControlName="targetAmount"]')!.value).toBe('5.000,00');
    expect(element.querySelector<HTMLInputElement>('input[formControlName="savedAmount"]')!.value).toBe('2.000,50');

    await submit(fixture);

    const request = http.expectOne('/api/goals/g1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.savedAmount).toBe(2000.5);
    request.flush(GOAL);
    expect(close).toHaveBeenCalledWith(GOAL);
  });

  it('mostra a recusa do backend e continua aberto; em falha do servidor, usa a mensagem do manual', async () => {
    const fixture = await setup(GoalFormDialog, {});
    fillValid();

    await submit(fixture);
    http.expectOne('/api/goals').flush({ detail: 'Recusado.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(element.textContent).toContain('Recusado.');

    await submit(fixture);
    http.expectOne('/api/goals').flush({ detail: 'Interno' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(element.textContent).toContain('Não foi possível salvar. Tente novamente.');
    expect(close).not.toHaveBeenCalled();
  });
});

describe('ContributionDialog', () => {
  it('avisa que o registro não altera o saldo', async () => {
    await setup(ContributionDialog, GOAL);

    expect(element.textContent).toContain('Notebook');
    expect(element.textContent).toContain('Este registro não altera seu saldo.');
    expect(element.textContent).toContain('cadastre também uma despesa');
    http.expectNone('/api/goals/g1/contributions');
  });

  it.each([
    ['', 'Preencha todos os campos obrigatórios.'],
    ['0', 'Informe um valor maior que zero.'],
    ['abc', 'Informe um valor válido, como 1.250,50.'],
  ])('com o valor "%s", explica e não chama a API', async (value, message) => {
    const fixture = await setup(ContributionDialog, GOAL);
    type('amount', value);
    await submit(fixture);

    expect(element.textContent).toContain(message);
    http.expectNone('/api/goals/g1/contributions');
  });

  it('envia o valor como número e fecha com a meta atualizada', async () => {
    const fixture = await setup(ContributionDialog, GOAL);
    type('amount', '1.250,50');
    await submit(fixture);

    const request = http.expectOne('/api/goals/g1/contributions');
    expect(request.request.body).toEqual({ amount: 1250.5 });
    request.flush(GOAL);
    expect(close).toHaveBeenCalledWith(GOAL);
  });

  it('em caso de recusa, continua aberto e mostra o motivo', async () => {
    const fixture = await setup(ContributionDialog, GOAL);
    type('amount', '10');
    await submit(fixture);

    http
      .expectOne('/api/goals/g1/contributions')
      .flush({ detail: 'O valor guardado ultrapassa o limite permitido.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(element.textContent).toContain('O valor guardado ultrapassa o limite permitido.');
    expect(close).not.toHaveBeenCalled();
  });
});

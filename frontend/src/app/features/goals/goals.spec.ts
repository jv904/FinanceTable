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
import { ConfirmDeleteData } from '../../shared/confirm-delete-dialog';
import { Goals } from './goals';
import { Goal } from './goal.service';

registerLocaleData(localePt);

const API = '/api/goals';
const NOTEBOOK: Goal = {
  id: 'g1',
  name: 'Comprar um notebook',
  targetAmount: 5000,
  savedAmount: 2000,
  remainingAmount: 3000,
  progressPercent: 40,
  targetDate: '2027-06-30',
};
const TRIP: Goal = {
  id: 'g2',
  name: 'Viagem',
  targetAmount: 1000,
  savedAmount: 1200,
  remainingAmount: 0,
  progressPercent: 100,
  targetDate: '2027-01-15',
};

describe('Goals', () => {
  let fixture: ComponentFixture<Goals>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const open = vi.fn();

  beforeEach(async () => {
    open.mockReset();
    TestBed.configureTestingModule({
      imports: [Goals],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: MatDialog, useValue: { open } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Goals);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function respond(goals: Goal[]): Promise<void> {
    http.expectOne(API).flush(goals);
    await fixture.whenStable();
  }

  const text = () => element.textContent!.replace(/\s+/g, ' ');

  function dialogReturns(result: unknown): void {
    open.mockReturnValue({ afterClosed: () => of(result) });
  }

  function byLabel(label: string): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll('button')).find((item) => item.textContent!.includes(label))!;
  }

  it('mostra o exemplo do manual: valores, 40%, quanto falta e data', async () => {
    expect(text()).toContain('Carregando metas...');
    await respond([NOTEBOOK]);

    expect(text()).toContain('Comprar um notebook');
    expect(text()).toMatch(/R\$\s2\.000,00 de R\$\s5\.000,00/);
    expect(text()).toContain('40%');
    expect(text()).toMatch(/Falta R\$\s3\.000,00/);
    expect(text()).toContain('Data prevista: 30/06/2027');

    const bar = element.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.getAttribute('aria-label')).toBe('Progresso de Comprar um notebook');
    expect(bar.querySelector<HTMLElement>('.fill')!.style.width).toBe('40%');
  });

  it('meta alcançada diz isso, em vez de quanto falta', async () => {
    await respond([TRIP]);

    expect(text()).toContain('Meta alcançada!');
    expect(text()).toContain('100%');
    expect(text()).not.toContain('Falta');
  });

  it('avisa quando não há metas', async () => {
    await respond([]);

    expect(text()).toContain('Nenhuma meta cadastrada.');
  });

  it('em caso de erro, mostra a mensagem e permite tentar de novo', async () => {
    http.expectOne(API).flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(text()).toContain('Falhou.');

    button('Tentar novamente').click();
    await respond([NOTEBOOK]);

    expect(text()).not.toContain('Falhou.');
    expect(text()).toContain('Comprar um notebook');
  });

  it('ao criar, recarrega a lista, cuja ordem vem do backend', async () => {
    await respond([NOTEBOOK]);
    dialogReturns(TRIP);

    button('Nova meta').click();

    expect(open.mock.calls[0][1].data).toEqual({});
    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Meta salva com sucesso!');
    await respond([TRIP, NOTEBOOK]);
    expect(text()).toContain('Viagem');
  });

  it('ao editar, passa a meta para o formulário', async () => {
    await respond([NOTEBOOK]);
    dialogReturns(undefined);

    byLabel('Editar Comprar um notebook').click();

    expect(open.mock.calls[0][1].data).toEqual({ goal: NOTEBOOK });
    http.expectNone(API);
  });

  it('ao registrar valor, atualiza o cartão com a resposta', async () => {
    await respond([NOTEBOOK, TRIP]);
    dialogReturns({ ...NOTEBOOK, savedAmount: 2500, remainingAmount: 2500, progressPercent: 50 });

    button('Registrar valor').click();
    await fixture.whenStable();

    expect(open.mock.calls[0][1].data).toEqual(NOTEBOOK);
    expect(text()).toContain('50%');
    expect(text()).toMatch(/Falta R\$\s2\.500,00/);
    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Valor registrado com sucesso!');
    http.expectNone(API);
  });

  it('ao excluir, confirma antes, chama a rota certa e tira o cartão', async () => {
    await respond([NOTEBOOK, TRIP]);
    dialogReturns(true);

    byLabel('Excluir Viagem').click();
    await fixture.whenStable();

    const data: ConfirmDeleteData = open.mock.calls[0][1].data;
    expect(data.title).toBe('Excluir meta');
    expect(data.message).toContain('"Viagem"');
    data.remove().subscribe();
    expect(http.expectOne(`${API}/g2`).request.method).toBe('DELETE');

    expect(text()).not.toContain('Viagem');
    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Meta excluída com sucesso!');
  });

  it('se um diálogo for cancelado, nada muda', async () => {
    await respond([NOTEBOOK]);
    dialogReturns(undefined);

    button('Registrar valor').click();
    byLabel('Excluir Comprar um notebook').click();
    await fixture.whenStable();

    expect(text()).toContain('Comprar um notebook');
    expect(TestBed.inject(NotificationService).success).not.toHaveBeenCalled();
    http.expectNone(API);
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ConfirmDeleteData, ConfirmDeleteDialog } from './confirm-delete-dialog';

describe('ConfirmDeleteDialog', () => {
  let fixture: ComponentFixture<ConfirmDeleteDialog>;
  let element: HTMLElement;
  const close = vi.fn();

  async function setup(remove: ConfirmDeleteData['remove']): Promise<void> {
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [ConfirmDeleteDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { title: 'Excluir categoria', message: 'Deseja excluir?', remove } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    fixture = TestBed.createComponent(ConfirmDeleteDialog);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function confirm(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button.confirm')!.click();
    await fixture.whenStable();
  }

  it('mostra o título e a mensagem recebidos', async () => {
    await setup(() => of(undefined));

    expect(element.textContent).toContain('Excluir categoria');
    expect(element.textContent).toContain('Deseja excluir?');
  });

  it('só exclui depois de confirmar, e então fecha', async () => {
    const remove = vi.fn(() => of(undefined));
    await setup(remove);
    expect(remove).not.toHaveBeenCalled();

    await confirm();

    expect(remove).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('se a exclusão for recusada, continua aberto e mostra o motivo', async () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { detail: 'Esta categoria possui movimentações vinculadas.' },
    });
    await setup(() => throwError(() => error));

    await confirm();

    expect(element.textContent).toContain('Esta categoria possui movimentações vinculadas.');
    expect(close).not.toHaveBeenCalled();
    expect(element.querySelector<HTMLButtonElement>('button.confirm')!.disabled).toBe(false);
  });
});

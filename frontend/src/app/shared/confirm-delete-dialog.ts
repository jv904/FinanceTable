import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { apiErrorMessage } from '../core/http/api-error';

export interface ConfirmDeleteData {
  title: string;
  message: string;
  /** Faz a exclusão. Em caso de erro, o diálogo continua aberto e mostra a mensagem. */
  remove: () => Observable<void>;
}

export const CONFIRM_DIALOG_SIZE = { width: '440px', maxWidth: 'calc(100vw - 32px)' };

@Component({
  selector: 'app-confirm-delete-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (errorMessage()) {
        <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
      }
      <p class="question">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancelar</button>
      <button matButton="filled" type="button" class="confirm" [disabled]="deleting()" (click)="confirm()">
        {{ deleting() ? 'Excluindo...' : 'Excluir' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .question {
      margin: 0;
      overflow-wrap: anywhere;
    }

    .confirm:not(:disabled) {
      --mat-button-filled-container-color: var(--ft-expense);
    }
  `,
})
export class ConfirmDeleteDialog {
  private readonly dialog = inject<MatDialogRef<ConfirmDeleteDialog, boolean>>(MatDialogRef);

  protected readonly data = inject<ConfirmDeleteData>(MAT_DIALOG_DATA);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal('');

  protected confirm(): void {
    this.deleting.set(true);
    this.errorMessage.set('');

    this.data.remove().subscribe({
      next: () => this.dialog.close(true),
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.deleting.set(false);
      },
    });
  }
}

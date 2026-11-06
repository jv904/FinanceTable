import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { apiErrorMessage } from '../../core/http/api-error';
import { Category, CategoryService } from './category.service';

@Component({
  selector: 'app-confirm-delete-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Excluir categoria</h2>
    <mat-dialog-content>
      @if (errorMessage()) {
        <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
      }
      <p class="question">Deseja excluir a categoria "{{ category.name }}"? Esta ação não pode ser desfeita.</p>
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
  private readonly categories = inject(CategoryService);
  private readonly dialog = inject<MatDialogRef<ConfirmDeleteDialog, boolean>>(MatDialogRef);

  protected readonly category = inject<Category>(MAT_DIALOG_DATA);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal('');

  protected confirm(): void {
    this.deleting.set(true);
    this.errorMessage.set('');

    this.categories.remove(this.category.id).subscribe({
      next: () => this.dialog.close(true),
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.deleting.set(false);
      },
    });
  }
}

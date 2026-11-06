import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { apiErrorMessage } from '../../core/http/api-error';
import { Category, CategoryService, CategoryType } from './category.service';

export interface CategoryFormData {
  type: CategoryType;
  /** Presente ao renomear; ausente ao criar. */
  category?: Category;
}

const NEW_TITLES: Record<CategoryType, string> = {
  INCOME: 'Nova categoria de receita',
  EXPENSE: 'Nova categoria de despesa',
};

@Component({
  selector: 'app-category-form-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-dialog-content>
        @if (errorMessage()) {
          <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
        }
        <mat-form-field appearance="outline" class="field">
          <mat-label>Nome da categoria</mat-label>
          <input matInput formControlName="name" maxlength="60" autocomplete="off" />
          <mat-error>Preencha todos os campos obrigatórios.</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Salvando...' : 'Salvar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .field {
      width: 100%;
      margin-top: 8px;
    }
  `,
})
export class CategoryFormDialog {
  private readonly categories = inject(CategoryService);
  private readonly dialog = inject<MatDialogRef<CategoryFormDialog, Category>>(MatDialogRef);
  private readonly data = inject<CategoryFormData>(MAT_DIALOG_DATA);

  protected readonly title = this.data.category ? 'Editar categoria' : NEW_TITLES[this.data.type];
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    // O padrão recusa um nome feito só de espaços, que o "required" aceitaria.
    name: [this.data.category?.name ?? '', [Validators.required, Validators.pattern(/\S/)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    const name = this.form.getRawValue().name.trim();
    const request = this.data.category
      ? this.categories.rename(this.data.category.id, name)
      : this.categories.create(name, this.data.type);

    request.subscribe({
      next: (category) => this.dialog.close(category),
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }
}

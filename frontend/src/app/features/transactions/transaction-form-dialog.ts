import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/http/api-error';
import { amountProblem, formatAmount, parseAmount } from '../../shared/amount';
import { Category, CategoryType } from '../categories/category.service';
import { Transaction, TransactionService } from './transaction.service';

export interface TransactionFormData {
  type: CategoryType;
  categories: Category[];
  /** Presente ao editar; ausente ao criar. */
  transaction?: Transaction;
}

export const TRANSACTION_DIALOG_SIZE = { width: '480px', maxWidth: 'calc(100vw - 32px)' };

const REQUIRED_MESSAGE = 'Preencha todos os campos obrigatórios.';
const SAVE_FAILED_MESSAGE = 'Não foi possível salvar. Tente novamente.';

/** A data de hoje no fuso do usuário. toISOString() usaria UTC e, à noite, daria o dia seguinte. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function validAmount(control: AbstractControl<string>): ValidationErrors | null {
  return amountProblem(control.value) ? { amount: true } : null;
}

@Component({
  selector: 'app-transaction-form-dialog',
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.transaction ? 'Editar movimentação' : 'Nova movimentação' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-dialog-content class="content">
        @if (errorMessage()) {
          <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
        }

        <mat-button-toggle-group class="type" formControlName="type" aria-label="Tipo de movimentação">
          <mat-button-toggle value="INCOME">Receita</mat-button-toggle>
          <mat-button-toggle value="EXPENSE">Despesa</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="description" maxlength="150" autocomplete="off" />
          <mat-error>{{ requiredMessage }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Valor (R$)</mat-label>
          <input matInput formControlName="amount" inputmode="decimal" autocomplete="off" />
          <mat-error>{{ amountError() }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Categoria</mat-label>
          <mat-select formControlName="categoryId">
            @for (category of options(); track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
          <mat-error>{{ requiredMessage }}</mat-error>
        </mat-form-field>

        @if (!options().length) {
          <p class="ft-form-alert" role="alert">
            Não há categorias deste tipo.
            <a routerLink="/categorias" mat-dialog-close>Criar uma categoria</a>
          </p>
        }

        <mat-form-field appearance="outline" floatLabel="always">
          <mat-label>Data</mat-label>
          <input matInput type="date" formControlName="occurredOn" />
          <mat-error>{{ requiredMessage }}</mat-error>
        </mat-form-field>

        @if (data.transaction; as transaction) {
          <p class="created">Cadastrada em {{ transaction.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>
        }
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
    .content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    mat-form-field {
      width: 100%;
    }

    .type {
      flex: none;
      margin: 8px 0 16px;
    }

    .type mat-button-toggle {
      flex: 1;
    }

    .created {
      margin: 0;
      color: var(--ft-text-muted);
      font-size: 13px;
    }
  `,
})
export class TransactionFormDialog {
  private readonly transactions = inject(TransactionService);
  private readonly dialog = inject<MatDialogRef<TransactionFormDialog, Transaction>>(MatDialogRef);

  protected readonly data = inject<TransactionFormData>(MAT_DIALOG_DATA);
  protected readonly requiredMessage = REQUIRED_MESSAGE;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    type: [this.data.type, Validators.required],
    // O padrão recusa uma descrição feita só de espaços, que o "required" aceitaria.
    description: [this.data.transaction?.description ?? '', [Validators.required, Validators.pattern(/\S/)]],
    amount: [
      this.data.transaction ? formatAmount(this.data.transaction.amount) : '',
      [Validators.required, validAmount],
    ],
    categoryId: [this.data.transaction?.categoryId ?? '', Validators.required],
    occurredOn: [this.data.transaction?.occurredOn ?? today(), Validators.required],
  });

  private readonly type = toSignal(this.form.controls.type.valueChanges, { initialValue: this.data.type });
  private readonly amountText = toSignal(this.form.controls.amount.valueChanges, {
    initialValue: this.form.controls.amount.value,
  });

  protected readonly options = computed(() =>
    this.data.categories.filter((category) => category.type === this.type()),
  );
  protected readonly amountError = computed(() => amountProblem(this.amountText()) ?? '');

  constructor() {
    // A categoria escolhida pertence ao tipo anterior e deixaria de ser compatível.
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.categoryId.reset(''));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const data = {
      ...value,
      description: value.description.trim(),
      amount: parseAmount(value.amount)!,
    };
    const request = this.data.transaction
      ? this.transactions.update(this.data.transaction.id, data)
      : this.transactions.create(data);

    request.subscribe({
      next: (transaction) => this.dialog.close(transaction),
      error: (error: unknown) => {
        const serverFailed = error instanceof HttpErrorResponse && error.status >= 500;
        this.errorMessage.set(serverFailed ? SAVE_FAILED_MESSAGE : apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }
}

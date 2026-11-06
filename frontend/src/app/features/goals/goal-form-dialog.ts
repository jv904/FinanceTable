import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { apiErrorMessage } from '../../core/http/api-error';
import { amountProblem, formatAmount, optionalAmountProblem, parseAmount } from '../../shared/amount';
import { Goal, GoalService } from './goal.service';

export interface GoalFormData {
  /** Presente ao editar; ausente ao criar. */
  goal?: Goal;
}

export const GOAL_DIALOG_SIZE = { width: '480px', maxWidth: 'calc(100vw - 32px)' };

const REQUIRED_MESSAGE = 'Preencha todos os campos obrigatórios.';
const SAVE_FAILED_MESSAGE = 'Não foi possível salvar. Tente novamente.';

function validTarget(control: AbstractControl<string>): ValidationErrors | null {
  return amountProblem(control.value) ? { amount: true } : null;
}

function validSaved(control: AbstractControl<string>): ValidationErrors | null {
  return optionalAmountProblem(control.value) ? { amount: true } : null;
}

@Component({
  selector: 'app-goal-form-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.goal ? 'Editar meta' : 'Nova meta' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-dialog-content class="content">
        @if (errorMessage()) {
          <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
        }

        <mat-form-field appearance="outline">
          <mat-label>Nome do objetivo</mat-label>
          <input matInput formControlName="name" maxlength="150" autocomplete="off" />
          <mat-error>{{ requiredMessage }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Valor desejado (R$)</mat-label>
          <input matInput formControlName="targetAmount" inputmode="decimal" autocomplete="off" />
          <mat-error>{{ targetError() }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ data.goal ? 'Valor já guardado (R$)' : 'Valor inicial guardado (R$)' }}</mat-label>
          <input matInput formControlName="savedAmount" inputmode="decimal" autocomplete="off" />
          <mat-error>{{ savedError() }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" floatLabel="always">
          <mat-label>Data prevista</mat-label>
          <input matInput type="date" formControlName="targetDate" />
          <mat-error>{{ requiredMessage }}</mat-error>
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
    .content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    mat-form-field {
      width: 100%;
    }

    mat-form-field:first-of-type {
      margin-top: 8px;
    }
  `,
})
export class GoalFormDialog {
  private readonly goals = inject(GoalService);
  private readonly dialog = inject<MatDialogRef<GoalFormDialog, Goal>>(MatDialogRef);

  protected readonly data = inject<GoalFormData>(MAT_DIALOG_DATA);
  protected readonly requiredMessage = REQUIRED_MESSAGE;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    // O padrão recusa um nome feito só de espaços, que o "required" aceitaria.
    name: [this.data.goal?.name ?? '', [Validators.required, Validators.pattern(/\S/)]],
    targetAmount: [
      this.data.goal ? formatAmount(this.data.goal.targetAmount) : '',
      [Validators.required, validTarget],
    ],
    savedAmount: [this.data.goal ? formatAmount(this.data.goal.savedAmount) : '', validSaved],
    targetDate: [this.data.goal?.targetDate ?? '', Validators.required],
  });

  private readonly targetText = toSignal(this.form.controls.targetAmount.valueChanges, {
    initialValue: this.form.controls.targetAmount.value,
  });
  private readonly savedText = toSignal(this.form.controls.savedAmount.valueChanges, {
    initialValue: this.form.controls.savedAmount.value,
  });

  protected readonly targetError = computed(() => amountProblem(this.targetText()) ?? '');
  protected readonly savedError = computed(() => optionalAmountProblem(this.savedText()) ?? '');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const data = {
      name: value.name.trim(),
      targetAmount: parseAmount(value.targetAmount)!,
      savedAmount: value.savedAmount.trim() ? parseAmount(value.savedAmount)! : 0,
      targetDate: value.targetDate,
    };
    const request = this.data.goal ? this.goals.update(this.data.goal.id, data) : this.goals.create(data);

    request.subscribe({
      next: (goal) => this.dialog.close(goal),
      error: (error: unknown) => {
        const serverFailed = error instanceof HttpErrorResponse && error.status >= 500;
        this.errorMessage.set(serverFailed ? SAVE_FAILED_MESSAGE : apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }
}

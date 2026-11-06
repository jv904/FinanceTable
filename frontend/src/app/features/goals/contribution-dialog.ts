import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { apiErrorMessage } from '../../core/http/api-error';
import { amountProblem, parseAmount } from '../../shared/amount';
import { Goal, GoalService } from './goal.service';

const SAVE_FAILED_MESSAGE = 'Não foi possível salvar. Tente novamente.';

function validAmount(control: AbstractControl<string>): ValidationErrors | null {
  return amountProblem(control.value) ? { amount: true } : null;
}

@Component({
  selector: 'app-contribution-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Registrar valor guardado</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-dialog-content>
        @if (errorMessage()) {
          <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
        }
        <p class="goal">{{ goal.name }}</p>
        <mat-form-field appearance="outline">
          <mat-label>Valor (R$)</mat-label>
          <input matInput formControlName="amount" inputmode="decimal" autocomplete="off" />
          <mat-error>{{ amountError() }}</mat-error>
        </mat-form-field>
        <p class="note">
          Este registro não altera seu saldo. Para registrar a saída do dinheiro da conta, cadastre também uma despesa.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Salvando...' : 'Registrar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .goal {
      margin: 0 0 16px;
      font-weight: 500;
      overflow-wrap: anywhere;
    }

    mat-form-field {
      width: 100%;
    }

    .note {
      margin: 4px 0 0;
      color: var(--ft-text-muted);
      font-size: 13px;
      line-height: 1.4;
    }
  `,
})
export class ContributionDialog {
  private readonly goals = inject(GoalService);
  private readonly dialog = inject<MatDialogRef<ContributionDialog, Goal>>(MatDialogRef);

  protected readonly goal = inject<Goal>(MAT_DIALOG_DATA);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    amount: ['', [Validators.required, validAmount]],
  });

  private readonly amountText = toSignal(this.form.controls.amount.valueChanges, { initialValue: '' });

  protected readonly amountError = computed(() => amountProblem(this.amountText()) ?? '');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    this.goals.addContribution(this.goal.id, parseAmount(this.form.getRawValue().amount)!).subscribe({
      next: (goal) => this.dialog.close(goal),
      error: (error: unknown) => {
        const serverFailed = error instanceof HttpErrorResponse && error.status >= 500;
        this.errorMessage.set(serverFailed ? SAVE_FAILED_MESSAGE : apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }
}

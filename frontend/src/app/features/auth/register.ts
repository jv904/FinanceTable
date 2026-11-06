import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import {
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  passwordLength,
  passwordsMatch,
} from '../../shared/password.validators';
import { AuthLayout } from './auth-layout';

const REQUIRED_MESSAGE = 'Preencha todos os campos obrigatórios.';

@Component({
  selector: 'app-register',
  imports: [AuthLayout, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, RouterLink],
  template: `
    <app-auth-layout heading="Criar conta">
      @if (errorMessage()) {
        <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
      }
      <form class="ft-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Nome completo</mat-label>
          <input matInput formControlName="name" autocomplete="name" maxlength="150" />
          <mat-error>Informe seu nome.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" inputmode="email" />
          <mat-error>Informe um e-mail válido.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Senha</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-hint>De 8 a 72 caracteres.</mat-hint>
          <mat-error>{{ passwordLengthMessage }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Confirmar senha</mat-label>
          <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
          <mat-error>Confirme sua senha.</mat-error>
        </mat-form-field>
        @if (formStatus() && form.hasError('passwordMismatch') && form.controls.confirmPassword.touched) {
          <p class="ft-form-alert" role="alert">{{ passwordMismatchMessage }}</p>
        }
        <button matButton="filled" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Criando conta...' : 'Criar conta' }}
        </button>
      </form>
      <p class="ft-form-links">Já tem conta? <a routerLink="/entrar">Entrar</a></p>
    </app-auth-layout>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly passwordLengthMessage = PASSWORD_LENGTH_MESSAGE;
  protected readonly passwordMismatchMessage = PASSWORD_MISMATCH_MESSAGE;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordLength]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  protected readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(this.hasEmptyField() ? REQUIRED_MESSAGE : '');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.register(this.form.getRawValue()).subscribe({
      next: (message) => {
        this.notifications.success(message);
        void this.router.navigate(['/entrar']);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }

  private hasEmptyField(): boolean {
    return Object.values(this.form.controls).some((control) => control.hasError('required'));
  }
}

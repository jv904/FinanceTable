import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'app-login',
  imports: [AuthLayout, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, RouterLink],
  template: `
    <app-auth-layout heading="Entrar">
      @if (errorMessage()) {
        <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
      }
      <form class="ft-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" inputmode="email" />
          <mat-error>Informe seu e-mail.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Senha</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="current-password" />
          <mat-error>Informe sua senha.</mat-error>
        </mat-form-field>
        <a class="ft-forgot-link" routerLink="/esqueci-senha">Esqueci minha senha</a>
        <button matButton="filled" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
      <p class="ft-form-links">Ainda não tem conta? <a routerLink="/cadastro">Criar conta</a></p>
    </app-auth-layout>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Página que o usuário tentou abrir antes de ser levado ao login. */
  readonly returnUrl = input<string>();

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl(this.returnUrl() ?? '/inicio'),
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }
}

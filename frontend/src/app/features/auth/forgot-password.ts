import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'app-forgot-password',
  imports: [AuthLayout, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, RouterLink],
  template: `
    <app-auth-layout heading="Recuperar senha" subtitle="Informe seu e-mail para receber um link de redefinição.">
      @if (sentMessage()) {
        <p class="sent" role="status">{{ sentMessage() }}</p>
      } @else {
        @if (errorMessage()) {
          <p class="ft-form-alert" role="alert">{{ errorMessage() }}</p>
        }
        <form class="ft-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" inputmode="email" />
            <mat-error>Informe um e-mail válido.</mat-error>
          </mat-form-field>
          <button matButton="filled" type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Enviando...' : 'Enviar link' }}
          </button>
        </form>
      }
      <p class="ft-form-links"><a routerLink="/entrar">Voltar para o login</a></p>
    </app-auth-layout>
  `,
  styles: `
    .sent {
      margin: 0;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--ft-surface-muted);
      font-size: 14px;
      line-height: 1.5;
    }
  `,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly sentMessage = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: (message) => this.sentMessage.set(message),
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }
}

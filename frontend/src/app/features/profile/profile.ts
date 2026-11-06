import { Component, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroupDirective, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import {
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  passwordLength,
  passwordsMatch,
} from '../../shared/password.validators';

@Component({
  selector: 'app-profile',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h1>Perfil</h1>

    <section class="panel" aria-labelledby="account-title">
      <h2 id="account-title">Seus dados</h2>
      <dl>
        <dt>E-mail</dt>
        <dd>{{ auth.user()?.email }}</dd>
      </dl>
      @if (nameError()) {
        <p class="ft-form-alert" role="alert">{{ nameError() }}</p>
      }
      <form class="ft-form" [formGroup]="nameForm" (ngSubmit)="saveName()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="name" autocomplete="name" maxlength="150" />
          <mat-error>Informe seu nome.</mat-error>
        </mat-form-field>
        <button matButton="filled" type="submit" [disabled]="savingName()">
          {{ savingName() ? 'Salvando...' : 'Salvar nome' }}
        </button>
      </form>
    </section>

    <section class="panel" aria-labelledby="password-title">
      <h2 id="password-title">Alterar senha</h2>
      <p class="note">Ao alterar a senha, sua conta é desconectada dos outros aparelhos.</p>
      @if (passwordError()) {
        <p class="ft-form-alert" role="alert">{{ passwordError() }}</p>
      }
      <form
        #passwordFormRef="ngForm"
        class="ft-form"
        [formGroup]="passwordForm"
        (ngSubmit)="savePassword()"
        novalidate
      >
        <mat-form-field appearance="outline">
          <mat-label>Senha atual</mat-label>
          <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
          <mat-error>Informe sua senha atual.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Nova senha</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-hint>De 8 a 72 caracteres.</mat-hint>
          <mat-error>{{ passwordLengthMessage }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Confirmar nova senha</mat-label>
          <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
          <mat-error>Confirme sua senha.</mat-error>
        </mat-form-field>
        @if (
          passwordStatus() && passwordForm.hasError('passwordMismatch') && passwordForm.controls.confirmPassword.touched
        ) {
          <p class="ft-form-alert" role="alert">{{ passwordMismatchMessage }}</p>
        }
        <button matButton="filled" type="submit" [disabled]="savingPassword()">
          {{ savingPassword() ? 'Salvando...' : 'Alterar senha' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 560px;
    }

    h1 {
      margin: 0 0 20px;
      font-size: 26px;
      font-weight: 600;
    }

    h2 {
      margin: 0 0 16px;
      font-size: 18px;
      font-weight: 600;
    }

    .panel {
      margin-bottom: 16px;
      padding: 24px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    dl {
      margin: 0 0 20px;
    }

    dt {
      color: var(--ft-text-muted);
      font-size: 13px;
    }

    dd {
      margin: 2px 0 0;
      overflow-wrap: anywhere;
    }

    .note {
      margin: -8px 0 16px;
      color: var(--ft-text-muted);
      font-size: 14px;
      line-height: 1.4;
    }

    @media (max-width: 599px) {
      .panel {
        padding: 20px 16px;
      }
    }
  `,
})
export class Profile {
  protected readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly passwordDirective = viewChild.required<FormGroupDirective>('passwordFormRef');

  protected readonly passwordLengthMessage = PASSWORD_LENGTH_MESSAGE;
  protected readonly passwordMismatchMessage = PASSWORD_MISMATCH_MESSAGE;

  protected readonly savingName = signal(false);
  protected readonly nameError = signal('');
  protected readonly nameForm = this.formBuilder.group({
    // Só espaços contam como vazio: é o que o backend recusaria.
    name: [this.auth.user()?.name ?? '', [Validators.required, Validators.pattern(/\S/)]],
  });

  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal('');
  protected readonly passwordForm = this.formBuilder.group(
    {
      currentPassword: ['', Validators.required],
      password: ['', [Validators.required, passwordLength]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  protected readonly passwordStatus = toSignal(this.passwordForm.statusChanges, {
    initialValue: this.passwordForm.status,
  });

  protected saveName(): void {
    if (this.nameForm.invalid) {
      this.nameForm.markAllAsTouched();
      return;
    }
    this.savingName.set(true);
    this.nameError.set('');

    this.auth.updateName(this.nameForm.getRawValue().name).subscribe({
      next: (user) => {
        this.nameForm.reset({ name: user.name });
        this.notifications.success('Nome salvo com sucesso!');
        this.savingName.set(false);
      },
      error: (error: unknown) => {
        this.nameError.set(apiErrorMessage(error));
        this.savingName.set(false);
      },
    });
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.passwordError.set('');

    const { currentPassword, password, confirmPassword } = this.passwordForm.getRawValue();
    this.auth.changePassword(currentPassword, password, confirmPassword).subscribe({
      next: (message) => {
        // Pela diretiva, para os campos limpos não aparecerem em vermelho como se tivessem erro.
        this.passwordDirective().resetForm();
        this.notifications.success(message);
        this.savingPassword.set(false);
      },
      error: (error: unknown) => {
        this.passwordError.set(apiErrorMessage(error));
        this.savingPassword.set(false);
      },
    });
  }
}

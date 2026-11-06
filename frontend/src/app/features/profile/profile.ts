import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  template: `
    <h1>Perfil</h1>
    <section class="panel">
      <dl>
        <dt>Nome</dt>
        <dd>{{ auth.user()?.name }}</dd>
        <dt>E-mail</dt>
        <dd>{{ auth.user()?.email }}</dd>
      </dl>
    </section>
  `,
  styles: `
    h1 {
      margin: 0 0 20px;
      font-size: 26px;
      font-weight: 600;
    }

    .panel {
      padding: 24px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    dl {
      margin: 0;
    }

    dt {
      color: var(--ft-text-muted);
      font-size: 13px;
    }

    dd {
      margin: 2px 0 16px;
      overflow-wrap: anywhere;
    }

    dd:last-child {
      margin-bottom: 0;
    }
  `,
})
export class Profile {
  protected readonly auth = inject(AuthService);
}

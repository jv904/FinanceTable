import { Component, input } from '@angular/core';

import { Logo } from '../../shared/logo';

/** Moldura das telas de acesso: identidade visual, título e o formulário projetado. */
@Component({
  selector: 'app-auth-layout',
  imports: [Logo],
  template: `
    <main class="page">
      <div class="brand">
        <app-logo [size]="40" />
        <p class="tagline">Suas finanças organizadas, em um só lugar.</p>
      </div>
      <section class="card">
        <h1>{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
        <ng-content />
      </section>
    </main>
  `,
  styles: `
    .page {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      min-height: 100dvh;
      padding: 32px 16px;
    }

    .brand {
      text-align: center;
    }

    .tagline {
      margin: 8px 0 0;
      color: var(--ft-text-muted);
      font-size: 14px;
    }

    .card {
      box-sizing: border-box;
      width: 100%;
      max-width: 420px;
      padding: 28px 24px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    h1 {
      margin: 0 0 20px;
      font-size: 22px;
      font-weight: 600;
    }

    h1:has(+ .subtitle) {
      margin-bottom: 6px;
    }

    .subtitle {
      margin: 0 0 20px;
      color: var(--ft-text-muted);
      font-size: 14px;
      line-height: 1.5;
    }
  `,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <svg viewBox="0 0 32 32" aria-hidden="true" [attr.width]="size()" [attr.height]="size()">
      <rect width="32" height="32" rx="8" fill="var(--ft-brand)" />
      <rect x="7" y="17" width="4.5" height="8" rx="1.2" fill="#fff" />
      <rect x="13.75" y="12" width="4.5" height="13" rx="1.2" fill="#fff" />
      <rect x="20.5" y="7" width="4.5" height="18" rx="1.2" fill="#fff" />
    </svg>
    <span class="name">Finance<strong>Table</strong></span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .name {
      color: var(--mat-sys-on-surface);
      font-size: 20px;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    strong {
      color: var(--ft-brand);
      font-weight: 700;
    }
  `,
})
export class Logo {
  readonly size = input(32);
}

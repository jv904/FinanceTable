import { Component, input } from '@angular/core';

/** Página provisória das áreas que chegam nas próximas etapas. */
@Component({
  selector: 'app-coming-soon',
  template: `
    <h1>{{ heading() }}</h1>
    <section class="panel">
      <p class="badge">Em breve</p>
      <p class="description">{{ description() }}</p>
    </section>
  `,
  styles: `
    h1 {
      margin: 0 0 20px;
      font-size: 26px;
      font-weight: 600;
    }

    .panel {
      padding: 32px 24px;
      border: 1px dashed var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    .badge {
      display: inline-block;
      margin: 0 0 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--ft-brand-soft);
      color: var(--ft-brand);
      font-size: 12px;
      font-weight: 600;
    }

    .description {
      margin: 0;
      color: var(--ft-text-muted);
      line-height: 1.5;
    }
  `,
})
export class ComingSoon {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}

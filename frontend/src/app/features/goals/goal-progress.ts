import { Component, input } from '@angular/core';

/** Barra de progresso. A trilha é um tom claro da mesma cor, e o valor aparece em texto ao lado da barra. */
@Component({
  selector: 'app-goal-progress',
  template: `
    <div
      class="track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="percent()"
      [attr.aria-label]="'Progresso de ' + name()"
    >
      <div class="fill" [style.width.%]="percent()"></div>
    </div>
  `,
  styles: `
    .track {
      height: 8px;
      overflow: hidden;
      border-radius: 4px;
      background: var(--ft-brand-soft);
    }

    .fill {
      height: 100%;
      border-radius: 4px;
      background: var(--ft-brand);
    }
  `,
})
export class GoalProgress {
  readonly percent = input.required<number>();
  readonly name = input.required<string>();
}

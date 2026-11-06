import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

/** Receitas e despesas do mês. Nome e valor ficam escritos, para a leitura não depender da cor. */
@Component({
  selector: 'app-comparison-bars',
  imports: [CurrencyPipe],
  template: `
    @if (scale()) {
      <div class="row">
        <div class="legend">
          <span>Receitas</span>
          <strong>{{ income() | currency: 'BRL' }}</strong>
        </div>
        <div class="bar income" [style.width.%]="(income() / scale()) * 100"></div>
      </div>
      <div class="row">
        <div class="legend">
          <span>Despesas</span>
          <strong>{{ expense() | currency: 'BRL' }}</strong>
        </div>
        <div class="bar expense" [style.width.%]="(expense() / scale()) * 100"></div>
      </div>
    } @else {
      <p class="empty">{{ emptyMessage() }}</p>
    }
  `,
  styles: `
    .row + .row {
      margin-top: 16px;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 4px 12px;
      margin-bottom: 6px;
      color: var(--ft-text-muted);
      font-size: 14px;
    }

    strong {
      color: var(--mat-sys-on-surface);
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .bar {
      height: 20px;
      border-radius: 0 4px 4px 0;
    }

    .income {
      background: var(--ft-income);
    }

    .expense {
      background: var(--ft-expense);
    }

    .empty {
      margin: 0;
      color: var(--ft-text-muted);
    }
  `,
})
export class ComparisonBars {
  readonly income = input.required<number>();
  readonly expense = input.required<number>();
  readonly emptyMessage = input('Nenhuma movimentação neste mês.');

  protected readonly scale = computed(() => Math.max(this.income(), this.expense()));
}

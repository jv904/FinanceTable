import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { CategoryAmount } from './summary.service';

/** Texto da porcentagem. Fatia muito pequena não aparece como "0%", o que daria a entender que não houve gasto. */
export function shareText(amount: number, total: number): string {
  const percent = (amount / total) * 100;
  return percent < 1 ? '< 1%' : `${Math.round(percent)}%`;
}

/** Barras ordenadas, com a maior categoria como referência da escala. */
@Component({
  selector: 'app-category-bars',
  imports: [CurrencyPipe],
  template: `
    @if (rows().length) {
      <ul>
        @for (row of rows(); track row.categoryId) {
          <li>
            <div class="legend">
              <span class="name">{{ row.name }}</span>
              <span class="value">
                <strong>{{ row.amount | currency: 'BRL' }}</strong>
                <span class="share">{{ row.share }}</span>
              </span>
            </div>
            <div class="bar" [style.width.%]="row.width"></div>
          </li>
        }
      </ul>
    } @else {
      <p class="empty">Nenhuma despesa neste mês.</p>
    }
  `,
  styles: `
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li + li {
      margin-top: 12px;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 2px 12px;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .name {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .value {
      display: flex;
      gap: 8px;
      white-space: nowrap;
    }

    strong {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .share {
      min-width: 36px;
      color: var(--ft-text-muted);
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .bar {
      height: 10px;
      border-radius: 0 4px 4px 0;
      background: var(--ft-expense);
    }

    li:hover .bar {
      opacity: 0.8;
    }

    .empty {
      margin: 0;
      color: var(--ft-text-muted);
    }
  `,
})
export class CategoryBars {
  readonly categories = input.required<CategoryAmount[]>();

  protected readonly rows = computed(() => {
    const categories = this.categories();
    const total = categories.reduce((sum, category) => sum + category.amount, 0);
    const largest = Math.max(...categories.map((category) => category.amount), 0);
    return categories.map((category) => ({
      ...category,
      share: shareText(category.amount, total),
      width: (category.amount / largest) * 100,
    }));
  });
}

import { CurrencyPipe } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';

import { monthShort, monthTitle } from './month';
import { MonthAmount } from './summary.service';

const HEIGHT = 240;
const MARGIN = { top: 32, right: 16, bottom: 28, left: 72 };
const TICKS = 4;

/** Menor número "redondo" (1, 2 ou 5 vezes uma potência de 10) que cabe no eixo. */
export function niceMax(value: number): number {
  if (value <= 0) {
    return 0;
  }
  // Com poucos centavos, a escala ficaria tão fina que os rótulos do eixo se repetiriam.
  const target = Math.max(value, 1);
  const power = 10 ** Math.floor(Math.log10(target / TICKS));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate * TICKS >= target)!;
  return step * TICKS;
}

const AXIS_FORMAT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Linha dos gastos por mês. Os rótulos são desenhados em pixels reais, então o SVG acompanha a largura da tela. */
@Component({
  selector: 'app-expense-trend',
  imports: [CurrencyPipe],
  template: `
    @if (scaleMax()) {
      <div class="plot" [style.height.px]="height">
        <svg
          [attr.width]="width()"
          [attr.height]="height"
          role="group"
          tabindex="0"
          [attr.aria-label]="description()"
          (pointermove)="pointTo($event)"
          (pointerdown)="pointTo($event)"
          (pointerleave)="active.set(null)"
          (focus)="active.set(selectedIndex())"
          (blur)="active.set(null)"
          (keydown)="onKey($event)"
        >
          @for (tick of ticks(); track tick.value) {
            <line class="grid" [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="tick.y" [attr.y2]="tick.y" />
            <text class="tick" [attr.x]="left - 8" [attr.y]="tick.y + 4" text-anchor="end">{{ tick.label }}</text>
          }

          <path class="area" [attr.d]="areaPath()" />
          <path class="line" [attr.d]="linePath()" />

          @if (active() !== null) {
            <line
              class="crosshair"
              [attr.x1]="points()[active()!].x"
              [attr.x2]="points()[active()!].x"
              [attr.y1]="top"
              [attr.y2]="height - bottom"
            />
          }

          @for (point of points(); track point.month; let index = $index) {
            <circle
              class="dot"
              [class.selected]="point.month === selected()"
              [attr.cx]="point.x"
              [attr.cy]="point.y"
              [attr.r]="point.month === selected() || index === active() ? 6 : 4"
            />
            <text class="month" [attr.x]="point.x" [attr.y]="height - 8" [attr.text-anchor]="anchor(index)">
              {{ point.label }}
            </text>
          }
        </svg>

        @if (active() !== null) {
          <div class="tooltip" role="status" [style.left.px]="tooltipLeft()">
            <strong>{{ points()[active()!].amount | currency: 'BRL' }}</strong>
            <span>{{ points()[active()!].title }}</span>
          </div>
        }
      </div>

      <details>
        <summary>Ver como tabela</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col" class="amount">Despesas</th>
            </tr>
          </thead>
          <tbody>
            @for (point of points(); track point.month) {
              <tr>
                <td>{{ point.title }}</td>
                <td class="amount">{{ point.amount | currency: 'BRL' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </details>
    } @else {
      <p class="empty">Nenhuma despesa nos últimos 6 meses.</p>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .plot {
      position: relative;
      overflow: hidden;
    }

    svg {
      display: block;
      border-radius: 8px;
      touch-action: pan-y;
    }

    svg:focus-visible {
      outline: 2px solid var(--ft-brand);
      outline-offset: 2px;
    }

    .grid {
      stroke: var(--ft-border);
      stroke-width: 1;
    }

    .tick,
    .month {
      fill: var(--ft-text-muted);
      font-size: 12px;
    }

    .tick {
      font-variant-numeric: tabular-nums;
    }

    .area {
      fill: var(--ft-expense);
      opacity: 0.1;
    }

    .line {
      fill: none;
      stroke: var(--ft-expense);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .crosshair {
      stroke: var(--ft-text-muted);
      stroke-width: 1;
    }

    .dot {
      fill: #fff;
      stroke: var(--ft-expense);
      stroke-width: 2;
    }

    .dot.selected {
      fill: var(--ft-expense);
      stroke: #fff;
    }

    .tooltip {
      position: absolute;
      top: 0;
      display: flex;
      flex-direction: column;
      width: 150px;
      padding: 6px 10px;
      border: 1px solid var(--ft-border);
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
      font-size: 13px;
      pointer-events: none;
    }

    .tooltip span {
      color: var(--ft-text-muted);
    }

    details {
      margin-top: 12px;
      font-size: 14px;
    }

    summary {
      color: var(--ft-brand);
      cursor: pointer;
      font-weight: 500;
    }

    table {
      width: 100%;
      margin-top: 8px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 6px 0;
      border-top: 1px solid var(--ft-border);
      font-weight: 400;
      text-align: left;
    }

    th {
      border-top: 0;
      color: var(--ft-text-muted);
    }

    .amount {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .empty {
      margin: 0;
      color: var(--ft-text-muted);
    }
  `,
})
export class ExpenseTrend {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly months = input.required<MonthAmount[]>();
  /** Mês em destaque, no formato AAAA-MM. */
  readonly selected = input.required<string>();

  protected readonly height = HEIGHT;
  protected readonly top = MARGIN.top;
  protected readonly bottom = MARGIN.bottom;
  protected readonly left = MARGIN.left;
  protected readonly right = MARGIN.right;
  protected readonly width = signal(640);
  protected readonly active = signal<number | null>(null);

  protected readonly scaleMax = computed(() => niceMax(Math.max(...this.months().map((month) => month.amount), 0)));

  protected readonly ticks = computed(() =>
    Array.from({ length: TICKS + 1 }, (_, index) => {
      const value = (this.scaleMax() / TICKS) * index;
      return { value, label: AXIS_FORMAT.format(value), y: this.yOf(value) };
    }),
  );

  protected readonly points = computed(() => {
    const months = this.months();
    const plotWidth = this.width() - MARGIN.left - MARGIN.right;
    const gap = plotWidth / Math.max(months.length - 1, 1);
    return months.map((month, index) => ({
      ...month,
      x: MARGIN.left + gap * index,
      y: this.yOf(month.amount),
      label: monthShort(month.month),
      title: monthTitle(month.month),
    }));
  });

  protected readonly linePath = computed(() =>
    this.points()
      .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
      .join(' '),
  );

  protected readonly areaPath = computed(() => {
    const points = this.points();
    const base = HEIGHT - MARGIN.bottom;
    return `${this.linePath()} L ${points.at(-1)!.x} ${base} L ${points[0].x} ${base} Z`;
  });

  protected readonly selectedIndex = computed(() => {
    const index = this.months().findIndex((month) => month.month === this.selected());
    return index < 0 ? this.months().length - 1 : index;
  });

  protected readonly description = computed(
    () =>
      'Evolução das despesas. ' +
      this.points()
        .map((point) => `${point.title}: ${point.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
        .join('; '),
  );

  /** O tooltip acompanha o ponto, sem sair da área do gráfico. */
  protected readonly tooltipLeft = computed(() => {
    const index = this.active();
    if (index === null) {
      return 0;
    }
    const tooltipWidth = 150;
    return Math.min(Math.max(this.points()[index].x - tooltipWidth / 2, 0), this.width() - tooltipWidth);
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) => {
        if (entry.contentRect.width > 0) {
          this.width.set(entry.contentRect.width);
        }
      });
      observer.observe(this.element.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected anchor(index: number): string {
    if (index === 0) {
      return 'start';
    }
    return index === this.months().length - 1 ? 'end' : 'middle';
  }

  protected pointTo(event: PointerEvent): void {
    const svg = event.currentTarget as SVGElement;
    const x = event.clientX - svg.getBoundingClientRect().left;
    this.active.set(this.nearestIndex(x));
  }

  protected onKey(event: KeyboardEvent): void {
    const delta = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (delta === undefined) {
      return;
    }
    event.preventDefault();
    const start = this.active() ?? this.selectedIndex();
    this.active.set(Math.min(Math.max(start + delta, 0), this.months().length - 1));
  }

  private nearestIndex(x: number): number {
    let nearest = 0;
    this.points().forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(this.points()[nearest].x - x)) {
        nearest = index;
      }
    });
    return nearest;
  }

  private yOf(value: number): number {
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    return HEIGHT - MARGIN.bottom - (value / this.scaleMax()) * plotHeight;
  }
}

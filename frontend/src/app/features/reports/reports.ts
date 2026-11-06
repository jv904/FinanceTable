import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, EMPTY, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import { CategoryBars } from '../home/category-bars';
import { ComparisonBars } from '../home/comparison-bars';
import { ExpenseTrend } from '../home/expense-trend';
import { currentMonth, firstDay, lastDay, monthTitle, shiftMonth } from '../home/month';
import { TransactionPage, TransactionService } from '../transactions/transaction.service';
import { MonthComparison } from './month-comparison';
import { Report, ReportService } from './report.service';

const INVERTED_PERIOD_MESSAGE = 'A data inicial não pode ser posterior à data final.';
const MAX_TREND_MONTHS = 12;

type Mode = 'month' | 'custom';

@Component({
  selector: 'app-reports',
  imports: [
    CategoryBars,
    ComparisonBars,
    CurrencyPipe,
    DatePipe,
    ExpenseTrend,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MonthComparison,
    ReactiveFormsModule,
  ],
  template: `
    <header class="title">
      <h1>Relatórios</h1>
      <button matButton="outlined" type="button" [disabled]="!canExport()" (click)="exportCsv()">
        <mat-icon>download</mat-icon>
        {{ exporting() ? 'Exportando...' : 'Exportar planilha' }}
      </button>
    </header>

    <section class="panel period" aria-label="Período consultado">
      <mat-button-toggle-group
        hideSingleSelectionIndicator
        aria-label="Tipo de período"
        [value]="mode()"
        (change)="setMode($event.value)"
      >
        <mat-button-toggle value="month">Mês</mat-button-toggle>
        <mat-button-toggle value="custom">Período</mat-button-toggle>
      </mat-button-toggle-group>

      @if (mode() === 'month') {
        <nav class="months" aria-label="Mês consultado">
          <button matIconButton type="button" aria-label="Mês anterior" (click)="move(-1)">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <strong class="month" aria-live="polite">{{ title() }}</strong>
          <button matIconButton type="button" aria-label="Próximo mês" (click)="move(1)">
            <mat-icon>chevron_right</mat-icon>
          </button>
          @if (!isCurrentMonth()) {
            <button matButton type="button" (click)="goToCurrent()">Mês atual</button>
          }
        </nav>
      } @else {
        <form class="dates" [formGroup]="dates">
          <mat-form-field appearance="outline" floatLabel="always" subscriptSizing="dynamic">
            <mat-label>De</mat-label>
            <input matInput type="date" formControlName="from" />
          </mat-form-field>
          <mat-form-field appearance="outline" floatLabel="always" subscriptSizing="dynamic">
            <mat-label>Até</mat-label>
            <input matInput type="date" formControlName="to" />
          </mat-form-field>
        </form>
      }
    </section>

    @if (periodError()) {
      <p class="ft-form-alert" role="alert">{{ periodError() }}</p>
    } @else if (loadError()) {
      <div class="panel load-error">
        <p class="ft-form-alert" role="alert">{{ loadError() }}</p>
        <button matButton="outlined" type="button" (click)="reload()">Tentar novamente</button>
      </div>
    } @else if (report(); as report) {
      <div class="content" [class.stale]="refreshing()">
        <div class="tiles">
          <section class="panel tile">
            <span class="label">Receitas</span>
            <span class="value">{{ report.income | currency: 'BRL' }}</span>
          </section>
          <section class="panel tile">
            <span class="label">Despesas</span>
            <span class="value">{{ report.expense | currency: 'BRL' }}</span>
          </section>
          <section class="panel tile">
            <span class="label">Resultado</span>
            <span class="value">{{ report.result | currency: 'BRL' }}</span>
          </section>
        </div>

        <div class="grid">
          <section class="panel">
            <h2>Receitas e despesas</h2>
            <app-comparison-bars
              [income]="report.income"
              [expense]="report.expense"
              emptyMessage="Nenhuma movimentação neste período."
            />
          </section>

          <section class="panel">
            <h2>Maiores despesas por categoria</h2>
            <app-category-bars
              [categories]="report.expensesByCategory"
              emptyMessage="Nenhuma despesa neste período."
            />
          </section>

          <!-- Com um único mês, a tabela só repetiria os totais acima. -->
          @if (report.months.length > 1) {
            <section class="panel wide">
              <h2>Evolução no período</h2>
              @if (trend().length) {
                <p class="chart-title">Despesas de cada mês</p>
                <app-expense-trend
                  class="trend"
                  [months]="trend()"
                  [selected]="trend().at(-1)!.month"
                  [showTable]="false"
                  emptyMessage="Nenhuma despesa neste período."
                />
              }
              <table class="stack">
                <thead>
                  <tr>
                    <th scope="col">Mês</th>
                    <th scope="col" class="amount">Receitas</th>
                    <th scope="col" class="amount">Despesas</th>
                    <th scope="col" class="amount">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of report.months; track row.month) {
                    <tr>
                      <th scope="row">{{ monthName(row.month) }}</th>
                      <td class="amount" data-label="Receitas">{{ row.income | currency: 'BRL' }}</td>
                      <td class="amount" data-label="Despesas">{{ row.expense | currency: 'BRL' }}</td>
                      <td class="amount" data-label="Resultado">{{ row.result | currency: 'BRL' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          }
        </div>
      </div>
    } @else {
      <p class="message" role="status">Carregando relatório...</p>
    }

    <section class="panel block">
      <h2>Comparar meses</h2>
      <app-month-comparison />
    </section>

    @if (!periodError()) {
      <section class="panel block">
        <h2>Histórico das movimentações</h2>
        @if (historyError()) {
          <p class="ft-form-alert" role="alert">{{ historyError() }}</p>
          <button matButton="outlined" type="button" (click)="reloadHistory()">Tentar novamente</button>
        } @else if (history(); as history) {
          @if (history.content.length) {
            <ul class="history" [class.stale]="historyRefreshing()">
              @for (item of history.content; track item.id) {
                <li>
                  <div class="details">
                    <span class="description">{{ item.description }}</span>
                    <span class="meta">
                      {{ item.occurredOn | date: 'dd/MM/yyyy' }} · {{ item.categoryName }} ·
                      {{ item.type === 'INCOME' ? 'Receita' : 'Despesa' }}
                    </span>
                  </div>
                  <span
                    class="item-amount"
                    [class.income]="item.type === 'INCOME'"
                    [class.expense]="item.type === 'EXPENSE'"
                  >
                    {{ item.type === 'INCOME' ? '+' : '−' }} {{ item.amount | currency: 'BRL' }}
                  </span>
                </li>
              }
            </ul>

            @if (history.totalPages > 1) {
              <nav class="pager" aria-label="Páginas do histórico">
                <button matButton="outlined" type="button" [disabled]="page() === 0" (click)="goTo(page() - 1)">
                  Anterior
                </button>
                <span>Página {{ page() + 1 }} de {{ history.totalPages }}</span>
                <button
                  matButton="outlined"
                  type="button"
                  [disabled]="page() + 1 >= history.totalPages"
                  (click)="goTo(page() + 1)"
                >
                  Próxima
                </button>
              </nav>
            }
          } @else {
            <p class="message">Nenhuma movimentação encontrada.</p>
          }
        } @else {
          <p class="message" role="status">Carregando movimentações...</p>
        }
      </section>
    }
  `,
  styles: `
    .title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
    }

    h2 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 600;
    }

    .panel {
      min-width: 0;
      padding: 20px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    .stale {
      opacity: 0.55;
      transition: opacity 120ms;
    }

    .period {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 20px;
      margin-bottom: 16px;
    }

    .months {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .month {
      min-width: 170px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
    }

    .dates {
      display: grid;
      flex: 1 1 280px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .tile {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 20px;
    }

    .label {
      color: var(--ft-text-muted);
      font-size: 14px;
    }

    .value {
      font-size: 22px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }

    .wide {
      grid-column: 1 / -1;
    }

    @media (max-width: 799px) {
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    .chart-title {
      margin: 0 0 8px;
      color: var(--ft-text-muted);
      font-size: 14px;
    }

    .trend {
      margin-bottom: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th,
    td {
      padding: 8px 0 8px 12px;
      border-top: 1px solid var(--ft-border);
      font-weight: 400;
      text-align: left;
      white-space: nowrap;
    }

    th:first-child {
      padding-left: 0;
    }

    thead th {
      border-top: 0;
      color: var(--ft-text-muted);
    }

    .amount {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    /* No celular, cada mês vira um bloco: nas colunas, os últimos valores ficariam fora da tela. */
    @media (max-width: 599px) {
      .stack thead {
        display: none;
      }

      .stack tr {
        display: block;
        padding: 8px 0;
        border-top: 1px solid var(--ft-border);
      }

      .stack th,
      .stack td {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 2px 0;
        border-top: 0;
      }

      .stack th {
        font-weight: 500;
      }

      .stack td::before {
        content: attr(data-label);
        color: var(--ft-text-muted);
      }
    }

    .block {
      margin-top: 16px;
    }

    .history {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .history li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 4px 12px;
      padding: 10px 0;
      border-top: 1px solid var(--ft-border);
    }

    .details {
      display: flex;
      flex: 1 1 200px;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .description {
      font-weight: 500;
      overflow-wrap: anywhere;
    }

    .meta {
      color: var(--ft-text-muted);
      font-size: 13px;
    }

    .item-amount {
      font-weight: 600;
      white-space: nowrap;
    }

    .income {
      color: var(--ft-income);
    }

    .expense {
      color: var(--ft-expense);
    }

    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 16px;
    }

    .message {
      margin: 0;
      color: var(--ft-text-muted);
    }

    .load-error .ft-form-alert {
      margin-bottom: 12px;
    }
  `,
})
export class Reports implements OnInit {
  private readonly service = inject(ReportService);
  private readonly transactions = inject(TransactionService);
  private readonly notifications = inject(NotificationService);
  private readonly reload$ = new Subject<void>();
  private readonly history$ = new Subject<void>();

  protected readonly mode = signal<Mode>('month');
  protected readonly month = signal(currentMonth());
  protected readonly dates = inject(NonNullableFormBuilder).group({
    from: firstDay(currentMonth()),
    to: lastDay(currentMonth()),
  });

  protected readonly report = signal<Report | null>(null);
  protected readonly refreshing = signal(false);
  protected readonly periodError = signal('');
  protected readonly loadError = signal('');

  protected readonly history = signal<TransactionPage | null>(null);
  protected readonly historyRefreshing = signal(false);
  protected readonly historyError = signal('');
  protected readonly page = signal(0);

  protected readonly exporting = signal(false);

  protected readonly title = computed(() => monthTitle(this.month()));
  protected readonly isCurrentMonth = computed(() => this.month() === currentMonth());

  /** Com um único mês não há linha para desenhar, e com muitos os rótulos se sobrepõem. */
  protected readonly trend = computed(() => {
    const months = this.report()?.months ?? [];
    return months.length >= 2 && months.length <= MAX_TREND_MONTHS
      ? months.map(({ month, expense }) => ({ month, amount: expense }))
      : [];
  });

  protected readonly canExport = computed(
    () =>
      !this.exporting() &&
      !this.periodError() &&
      !this.loadError() &&
      !this.historyError() &&
      !!this.history()?.totalElements,
  );

  constructor() {
    // switchMap cancela a consulta anterior: trocar de período rápido nunca mostra o período errado.
    this.reload$
      .pipe(
        switchMap(() => {
          const period = this.period();
          if (!period) {
            this.refreshing.set(false);
            return EMPTY;
          }
          this.refreshing.set(true);
          this.loadError.set('');
          return this.service.get(period.from, period.to).pipe(
            catchError((error: unknown) => {
              this.loadError.set(apiErrorMessage(error));
              this.refreshing.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((report) => {
        this.report.set(report);
        this.refreshing.set(false);
      });

    this.history$
      .pipe(
        switchMap(() => {
          const period = this.period();
          if (!period) {
            this.historyRefreshing.set(false);
            return EMPTY;
          }
          this.historyRefreshing.set(true);
          this.historyError.set('');
          const filters = { search: '', type: '' as const, categoryId: '', ...period };
          return this.transactions.list(filters, this.page()).pipe(
            catchError((error: unknown) => {
              this.historyError.set(apiErrorMessage(error));
              this.historyRefreshing.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((history) => {
        this.history.set(history);
        this.historyRefreshing.set(false);
      });

    this.dates.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.periodChanged());
  }

  ngOnInit(): void {
    this.periodChanged();
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected reloadHistory(): void {
    this.history$.next();
  }

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.periodChanged();
  }

  protected move(delta: number): void {
    this.month.update((month) => shiftMonth(month, delta));
    this.periodChanged();
  }

  protected goToCurrent(): void {
    this.month.set(currentMonth());
    this.periodChanged();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.history$.next();
  }

  protected monthName(month: string): string {
    return monthTitle(month);
  }

  protected exportCsv(): void {
    const period = this.period();
    if (!period) {
      return;
    }
    this.exporting.set(true);
    this.service.export(period.from, period.to).subscribe({
      next: (file) => {
        this.save(file, `movimentacoes-${period.from}-a-${period.to}.csv`);
        this.exporting.set(false);
      },
      error: () => {
        // O corpo do erro vem como blob, então apiErrorMessage não conseguiria ler o detalhe.
        this.notifications.error('Não foi possível exportar. Tente novamente.');
        this.exporting.set(false);
      },
    });
  }

  private periodChanged(): void {
    this.page.set(0);
    this.reload$.next();
    this.history$.next();
  }

  /** Devolve o período consultado, ou nulo depois de explicar na tela por que ele não serve. */
  private period(): { from: string; to: string } | null {
    if (this.mode() === 'month') {
      this.periodError.set('');
      return { from: firstDay(this.month()), to: lastDay(this.month()) };
    }
    const { from, to } = this.dates.getRawValue();
    if (!from || !to) {
      this.periodError.set('Preencha as duas datas do período.');
      return null;
    }
    if (from > to) {
      this.periodError.set(INVERTED_PERIOD_MESSAGE);
      return null;
    }
    this.periodError.set('');
    return { from, to };
  }

  private save(file: Blob, name: string): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
}

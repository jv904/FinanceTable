import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import { CategoryService, CategoryType } from '../categories/category.service';
import {
  TRANSACTION_DIALOG_SIZE,
  TransactionFormData,
  TransactionFormDialog,
} from '../transactions/transaction-form-dialog';
import { Transaction } from '../transactions/transaction.service';
import { CategoryBars } from './category-bars';
import { ComparisonBars } from './comparison-bars';
import { ExpenseTrend } from './expense-trend';
import { currentMonth, monthTitle, shiftMonth } from './month';
import { Summary, SummaryService } from './summary.service';

@Component({
  selector: 'app-home',
  imports: [
    CategoryBars,
    ComparisonBars,
    CurrencyPipe,
    DatePipe,
    ExpenseTrend,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  template: `
    <header class="title">
      <h1>Início</h1>
      <div class="new">
        <button matButton="filled" type="button" class="new-income" (click)="openCreate('INCOME')">
          <mat-icon>add</mat-icon>
          Nova receita
        </button>
        <button matButton="filled" type="button" class="new-expense" (click)="openCreate('EXPENSE')">
          <mat-icon>remove</mat-icon>
          Nova despesa
        </button>
      </div>
    </header>

    @if (loadError()) {
      <div class="panel load-error">
        <p class="ft-form-alert" role="alert">{{ loadError() }}</p>
        <button matButton="outlined" type="button" (click)="reload()">Tentar novamente</button>
      </div>
    } @else if (!summary()) {
      <p class="message" role="status">Carregando resumo...</p>
    } @else {
      <section class="panel balance" [class.stale]="refreshing()">
        <span class="label">Saldo atual</span>
        <span class="hero">{{ summary()!.balance | currency: 'BRL' }}</span>
      </section>

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

      <div class="content" [class.stale]="refreshing()">
        <div class="tiles">
          <section class="panel tile">
            <span class="label">Receitas do mês</span>
            <span class="value">{{ summary()!.income | currency: 'BRL' }}</span>
          </section>
          <section class="panel tile">
            <span class="label">Despesas do mês</span>
            <span class="value">{{ summary()!.expense | currency: 'BRL' }}</span>
          </section>
          <section class="panel tile">
            <span class="label">Diferença do mês</span>
            <span class="value">{{ summary()!.result | currency: 'BRL' }}</span>
          </section>
        </div>

        <div class="charts">
          <section class="panel">
            <h2>Receitas e despesas</h2>
            <app-comparison-bars [income]="summary()!.income" [expense]="summary()!.expense" />
          </section>

          <section class="panel">
            <h2>Despesas por categoria</h2>
            <app-category-bars [categories]="summary()!.expensesByCategory" />
          </section>

          <section class="panel wide">
            <h2>Evolução dos gastos</h2>
            <app-expense-trend [months]="summary()!.monthlyExpenses" [selected]="month()" />
          </section>

          <section class="panel wide">
            <header class="section-title">
              <h2>Últimas movimentações do mês</h2>
              <a routerLink="/movimentacoes">Ver todas</a>
            </header>
            @if (summary()!.recent.length) {
              <ul class="recent">
                @for (item of summary()!.recent; track item.id) {
                  <li>
                    <div class="details">
                      <span class="description">{{ item.description }}</span>
                      <span class="meta">
                        {{ item.occurredOn | date: 'dd/MM/yyyy' }} · {{ item.categoryName }} · {{ typeLabel(item) }}
                      </span>
                    </div>
                    <span
                      class="amount"
                      [class.income]="item.type === 'INCOME'"
                      [class.expense]="item.type === 'EXPENSE'"
                    >
                      {{ item.type === 'INCOME' ? '+' : '−' }} {{ item.amount | currency: 'BRL' }}
                    </span>
                  </li>
                }
              </ul>
            } @else {
              <p class="message">Nenhuma movimentação encontrada.</p>
            }
          </section>
        </div>
      </div>
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

    .new {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .new-income {
      --mat-button-filled-container-color: var(--ft-income);
    }

    .new-expense {
      --mat-button-filled-container-color: var(--ft-expense);
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

    .label {
      color: var(--ft-text-muted);
      font-size: 14px;
    }

    .balance {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hero {
      font-size: clamp(32px, 9vw, 48px);
      font-weight: 600;
      line-height: 1.15;
      overflow-wrap: anywhere;
    }

    .months {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin: 16px 0;
    }

    .month {
      min-width: 170px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
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

    .value {
      font-size: 22px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .charts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }

    .wide {
      grid-column: 1 / -1;
    }

    @media (max-width: 799px) {
      .charts {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    .section-title {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 4px 12px;
    }

    .section-title h2 {
      margin-bottom: 8px;
    }

    .section-title a {
      color: var(--ft-brand);
      font-size: 14px;
      font-weight: 500;
    }

    .recent {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .recent li {
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

    .amount {
      font-weight: 600;
      white-space: nowrap;
    }

    .income {
      color: var(--ft-income);
    }

    .expense {
      color: var(--ft-expense);
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
export class Home implements OnInit {
  private readonly service = inject(SummaryService);
  private readonly categories = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly reload$ = new Subject<void>();

  protected readonly month = signal(currentMonth());
  protected readonly summary = signal<Summary | null>(null);
  protected readonly refreshing = signal(false);
  protected readonly loadError = signal('');
  protected readonly title = computed(() => monthTitle(this.month()));
  protected readonly isCurrentMonth = computed(() => this.month() === currentMonth());

  constructor() {
    // switchMap cancela a consulta anterior: trocar de mês rápido nunca mostra o mês errado.
    this.reload$
      .pipe(
        switchMap(() => {
          this.refreshing.set(true);
          this.loadError.set('');
          return this.service.get(this.month()).pipe(
            catchError((error: unknown) => {
              this.loadError.set(apiErrorMessage(error));
              this.refreshing.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((summary) => {
        this.summary.set(summary);
        this.refreshing.set(false);
      });
  }

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected move(delta: number): void {
    this.month.update((month) => shiftMonth(month, delta));
    this.reload();
  }

  protected goToCurrent(): void {
    this.month.set(currentMonth());
    this.reload();
  }

  protected typeLabel(item: Transaction): string {
    return item.type === 'INCOME' ? 'Receita' : 'Despesa';
  }

  /** Busca as categorias na hora, para o formulário incluir as criadas há pouco. */
  protected openCreate(type: CategoryType): void {
    this.categories.list().subscribe({
      next: (categories) => {
        this.dialog
          .open<TransactionFormDialog, TransactionFormData, Transaction>(TransactionFormDialog, {
            ...TRANSACTION_DIALOG_SIZE,
            data: { type, categories },
          })
          .afterClosed()
          .subscribe((saved) => {
            if (saved) {
              this.notifications.success('Movimentação salva com sucesso!');
              this.reload();
            }
          });
      },
      error: (error: unknown) => this.notifications.error(apiErrorMessage(error)),
    });
  }
}

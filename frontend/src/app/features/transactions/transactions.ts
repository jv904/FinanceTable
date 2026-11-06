import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, debounceTime, EMPTY, Observable, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import { CONFIRM_DIALOG_SIZE, ConfirmDeleteData, ConfirmDeleteDialog } from '../../shared/confirm-delete-dialog';
import { Category, CategoryService, CategoryType } from '../categories/category.service';
import { TransactionFormData, TransactionFormDialog } from './transaction-form-dialog';
import { Transaction, TransactionFilters, TransactionPage, TransactionService } from './transaction.service';

const FORM_DIALOG_SIZE = { width: '480px', maxWidth: 'calc(100vw - 32px)' };
const INVERTED_PERIOD_MESSAGE = 'A data inicial não pode ser posterior à data final.';

@Component({
  selector: 'app-transactions',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <header class="title">
      <h1>Movimentações</h1>
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

    <form class="panel filters" [formGroup]="filters" aria-label="Filtros">
      <mat-form-field appearance="outline" class="search" subscriptSizing="dynamic">
        <mat-label>Pesquisar pela descrição</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput formControlName="search" autocomplete="off" />
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Tipo</mat-label>
        <mat-select formControlName="type">
          <mat-option value="">Todos</mat-option>
          <mat-option value="INCOME">Receitas</mat-option>
          <mat-option value="EXPENSE">Despesas</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Categoria</mat-label>
        <mat-select formControlName="categoryId">
          <mat-option value="">Todas</mat-option>
          @for (category of sortedCategories(); track category.id) {
            <mat-option [value]="category.id">
              {{ category.name }} ({{ category.type === 'INCOME' ? 'receita' : 'despesa' }})
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" floatLabel="always" subscriptSizing="dynamic">
        <mat-label>De</mat-label>
        <input matInput type="date" formControlName="from" />
      </mat-form-field>

      <mat-form-field appearance="outline" floatLabel="always" subscriptSizing="dynamic">
        <mat-label>Até</mat-label>
        <input matInput type="date" formControlName="to" />
      </mat-form-field>

      <button matButton type="button" class="clear" (click)="clearFilters()">Limpar filtros</button>
    </form>

    @if (rangeError()) {
      <p class="ft-form-alert" role="alert">{{ rangeError() }}</p>
    } @else if (loadError()) {
      <div class="panel load-error">
        <p class="ft-form-alert" role="alert">{{ loadError() }}</p>
        <button matButton="outlined" type="button" (click)="retry()">Tentar novamente</button>
      </div>
    } @else if (!result()) {
      <p class="message" role="status">Carregando movimentações...</p>
    } @else if (!items().length) {
      <p class="panel message">Nenhuma movimentação encontrada.</p>
    } @else {
      <ul class="panel list">
        @for (item of items(); track item.id) {
          <li>
            <div class="details">
              <span class="description">{{ item.description }}</span>
              <span class="meta">
                {{ item.occurredOn | date: 'dd/MM/yyyy' }} · {{ item.categoryName }} ·
                {{ item.type === 'INCOME' ? 'Receita' : 'Despesa' }}
              </span>
            </div>
            <span class="amount" [class.income]="item.type === 'INCOME'" [class.expense]="item.type === 'EXPENSE'">
              {{ item.type === 'INCOME' ? '+' : '−' }} {{ item.amount | currency: 'BRL' }}
            </span>
            <div class="actions">
              <button
                matIconButton
                type="button"
                [attr.aria-label]="'Editar ' + item.description"
                (click)="openEdit(item)"
              >
                <mat-icon>edit</mat-icon>
              </button>
              <button
                matIconButton
                type="button"
                [attr.aria-label]="'Excluir ' + item.description"
                (click)="openDelete(item)"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </li>
        }
      </ul>

      @if (totalPages() > 1) {
        <nav class="pager" aria-label="Páginas">
          <button matButton="outlined" type="button" [disabled]="page() === 0" (click)="goTo(page() - 1)">
            Anterior
          </button>
          <span>Página {{ page() + 1 }} de {{ totalPages() }}</span>
          <button matButton="outlined" type="button" [disabled]="page() + 1 >= totalPages()" (click)="goTo(page() + 1)">
            Próxima
          </button>
        </nav>
      }
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
      padding: 20px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      align-items: center;
      margin-bottom: 20px;
    }

    .search {
      grid-column: 1 / -1;
    }

    .list {
      margin: 0;
      padding-block: 4px;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 4px 12px;
      align-items: center;
      padding: 8px 0;
    }

    li + li {
      border-top: 1px solid var(--ft-border);
    }

    .details {
      display: flex;
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

    .actions {
      display: flex;
    }

    @media (max-width: 599px) {
      li {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .details {
        grid-column: 1 / -1;
      }
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
export class Transactions implements OnInit {
  private readonly transactions = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly reload$ = new Subject<void>();

  private readonly categories = signal<Category[]>([]);
  private readonly categoriesLoaded = signal(false);

  protected readonly filters = inject(NonNullableFormBuilder).group({
    search: '',
    type: '' as CategoryType | '',
    categoryId: '',
    from: '',
    to: '',
  });
  protected readonly result = signal<TransactionPage | null>(null);
  protected readonly page = signal(0);
  protected readonly rangeError = signal('');
  protected readonly loadError = signal('');
  protected readonly items = computed(() => this.result()?.content ?? []);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);
  protected readonly sortedCategories = computed(() =>
    [...this.categories()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );

  constructor() {
    // switchMap cancela a consulta anterior: uma resposta antiga nunca substitui uma mais nova.
    this.reload$
      .pipe(
        switchMap(() => this.fetch()),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.result.set(result));

    this.filters.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.page.set(0);
      this.reload$.next();
    });
  }

  ngOnInit(): void {
    this.reload$.next();
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.reload$.next();
  }

  protected clearFilters(): void {
    this.filters.reset();
  }

  protected openCreate(type: CategoryType): void {
    this.openForm({ type, categories: this.categories() });
  }

  protected openEdit(transaction: Transaction): void {
    this.openForm({ type: transaction.type, categories: this.categories(), transaction });
  }

  protected openDelete(transaction: Transaction): void {
    this.dialog
      .open<ConfirmDeleteDialog, ConfirmDeleteData, boolean>(ConfirmDeleteDialog, {
        ...CONFIRM_DIALOG_SIZE,
        data: {
          title: 'Excluir movimentação',
          message: `Deseja excluir "${transaction.description}"? Esta ação não pode ser desfeita.`,
          remove: () => this.transactions.remove(transaction.id),
        },
      })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          // Era a última linha da página: volta para a anterior, para não mostrar uma página vazia.
          if (this.items().length === 1 && this.page() > 0) {
            this.page.update((page) => page - 1);
          }
          this.notifications.success('Movimentação excluída com sucesso!');
          this.reload$.next();
        }
      });
  }

  private openForm(data: TransactionFormData): void {
    this.dialog
      .open<TransactionFormDialog, TransactionFormData, Transaction>(TransactionFormDialog, {
        ...FORM_DIALOG_SIZE,
        data,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.notifications.success('Movimentação salva com sucesso!');
          this.reload$.next();
        }
      });
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesLoaded.set(true);
      },
      error: (error: unknown) => this.loadError.set(apiErrorMessage(error)),
    });
  }

  private fetch(): Observable<TransactionPage> {
    const filters: TransactionFilters = this.filters.getRawValue();
    if (filters.from && filters.to && filters.from > filters.to) {
      this.rangeError.set(INVERTED_PERIOD_MESSAGE);
      return EMPTY;
    }
    this.rangeError.set('');
    this.loadError.set('');
    // Enquanto as categorias não chegam, o formulário diria que elas não existem. Toda consulta tenta de novo.
    if (!this.categoriesLoaded()) {
      this.loadCategories();
    }

    return this.transactions.list(filters, this.page()).pipe(
      catchError((error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        return EMPTY;
      }),
    );
  }
}

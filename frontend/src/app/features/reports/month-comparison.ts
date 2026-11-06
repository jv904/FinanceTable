import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { catchError, EMPTY, forkJoin, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error';
import { currentMonth, firstDay, lastDay, lastMonths, monthTitle, shiftMonth } from '../home/month';
import { Report, ReportService } from './report.service';

const MONTHS_AVAILABLE = 24;

/** Carrega à parte do relatório: se falhar, só este bloco mostra o erro. */
@Component({
  selector: 'app-month-comparison',
  imports: [CurrencyPipe, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <div class="pickers">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Mês</mat-label>
        <mat-select [value]="first()" (selectionChange)="choose(first, $event.value)">
          @for (month of options; track month.value) {
            <mat-option [value]="month.value">{{ month.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Comparar com</mat-label>
        <mat-select [value]="second()" (selectionChange)="choose(second, $event.value)">
          @for (month of options; track month.value) {
            <mat-option [value]="month.value">{{ month.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (error()) {
      <p class="ft-form-alert" role="alert">{{ error() }}</p>
      <button matButton="outlined" type="button" (click)="reload()">Tentar novamente</button>
    } @else if (rows().length) {
      <table [class.stale]="refreshing()">
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Valor</span></th>
            <th scope="col" class="amount">{{ firstTitle() }}</th>
            <th scope="col" class="amount">{{ secondTitle() }}</th>
            <th scope="col" class="amount">Diferença</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.label) {
            <tr>
              <th scope="row">{{ row.label }}</th>
              <td class="amount" [attr.data-label]="firstTitle()">{{ row.first | currency: 'BRL' }}</td>
              <td class="amount" [attr.data-label]="secondTitle()">{{ row.second | currency: 'BRL' }}</td>
              <td class="amount" data-label="Diferença">
                {{ row.difference > 0 ? '+' : '' }}{{ row.difference | currency: 'BRL' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
      <p class="note">Diferença: {{ firstTitle() }} menos {{ secondTitle() }}.</p>
    } @else {
      <p class="message" role="status">Carregando comparação...</p>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .pickers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .stale {
      opacity: 0.55;
      transition: opacity 120ms;
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
      white-space: normal;
    }

    tbody th {
      font-weight: 500;
    }

    .amount {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    /* No celular, cada linha vira um bloco: nas colunas, a diferença ficaria fora da tela. */
    @media (max-width: 599px) {
      thead {
        display: none;
      }

      tbody tr {
        display: block;
        padding: 8px 0;
        border-top: 1px solid var(--ft-border);
      }

      tbody th,
      tbody td {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 2px 0;
        border-top: 0;
      }

      tbody td::before {
        content: attr(data-label);
        color: var(--ft-text-muted);
      }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }

    .note,
    .message {
      margin: 12px 0 0;
      color: var(--ft-text-muted);
      font-size: 13px;
    }

    .ft-form-alert {
      margin-bottom: 12px;
    }
  `,
})
export class MonthComparison implements OnInit {
  private readonly service = inject(ReportService);
  private readonly reload$ = new Subject<void>();

  protected readonly options = lastMonths(currentMonth(), MONTHS_AVAILABLE).map((value) => ({
    value,
    label: monthTitle(value),
  }));
  protected readonly first = signal(currentMonth());
  protected readonly second = signal(shiftMonth(currentMonth(), -1));
  protected readonly refreshing = signal(false);
  protected readonly error = signal('');
  protected readonly firstTitle = computed(() => monthTitle(this.first()));
  protected readonly secondTitle = computed(() => monthTitle(this.second()));

  private readonly reports = signal<[Report, Report] | null>(null);

  protected readonly rows = computed(() => {
    const reports = this.reports();
    if (!reports) {
      return [];
    }
    const [first, second] = reports;
    return [
      this.row('Receitas', first.income, second.income),
      this.row('Despesas', first.expense, second.expense),
      this.row('Resultado', first.result, second.result),
    ];
  });

  constructor() {
    // switchMap cancela a consulta anterior: trocar de mês rápido nunca mostra a comparação errada.
    this.reload$
      .pipe(
        switchMap(() => {
          this.refreshing.set(true);
          this.error.set('');
          return forkJoin([this.load(this.first()), this.load(this.second())]).pipe(
            catchError((error: unknown) => {
              this.error.set(apiErrorMessage(error));
              this.refreshing.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((reports) => {
        this.reports.set(reports);
        this.refreshing.set(false);
      });
  }

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected choose(target: typeof this.first, month: string): void {
    target.set(month);
    this.reload();
  }

  private load(month: string) {
    return this.service.get(firstDay(month), lastDay(month));
  }

  private row(label: string, first: number, second: number) {
    // Arredonda para não mostrar resíduos de ponto flutuante, como 0,1 + 0,2 - 0,3.
    return { label, first, second, difference: Math.round((first - second) * 100) / 100 };
  }
}

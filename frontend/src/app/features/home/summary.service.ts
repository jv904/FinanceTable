import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Transaction } from '../transactions/transaction.service';

export interface CategoryAmount {
  categoryId: string;
  name: string;
  amount: number;
}

export interface MonthAmount {
  /** Mês no formato AAAA-MM. */
  month: string;
  amount: number;
}

export interface Summary {
  balance: number;
  income: number;
  expense: number;
  result: number;
  expensesByCategory: CategoryAmount[];
  monthlyExpenses: MonthAmount[];
  recent: Transaction[];
}

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private readonly http = inject(HttpClient);

  get(month: string): Observable<Summary> {
    return this.http.get<Summary>('/api/summary', { params: { month } });
  }
}

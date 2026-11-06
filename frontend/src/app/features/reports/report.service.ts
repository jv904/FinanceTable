import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CategoryAmount } from '../home/summary.service';

export interface MonthResult {
  /** Mês no formato AAAA-MM. Em mês parcial, soma só os dias dentro do período. */
  month: string;
  income: number;
  expense: number;
  result: number;
}

export interface Report {
  from: string;
  to: string;
  income: number;
  expense: number;
  result: number;
  expensesByCategory: CategoryAmount[];
  months: MonthResult[];
}

const API = '/api/reports';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  /** Datas no formato AAAA-MM-DD. */
  get(from: string, to: string): Observable<Report> {
    return this.http.get<Report>(API, { params: { from, to } });
  }

  /** Datas no formato AAAA-MM-DD. */
  export(from: string, to: string): Observable<Blob> {
    return this.http.get(`${API}/export`, { params: { from, to }, responseType: 'blob' });
  }
}

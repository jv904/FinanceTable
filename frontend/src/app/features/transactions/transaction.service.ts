import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CategoryType } from '../categories/category.service';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: CategoryType;
  categoryId: string;
  categoryName: string;
  /** Data no formato AAAA-MM-DD, sem horário nem fuso. */
  occurredOn: string;
  createdAt: string;
}

export interface TransactionData {
  description: string;
  amount: number;
  type: CategoryType;
  categoryId: string;
  occurredOn: string;
}

/** Campo vazio não filtra. */
export interface TransactionFilters {
  search: string;
  type: CategoryType | '';
  categoryId: string;
  from: string;
  to: string;
}

export interface TransactionPage {
  content: Transaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const API = '/api/transactions';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);

  list(filters: TransactionFilters, page: number): Observable<TransactionPage> {
    let params = new HttpParams().set('page', page);
    for (const [name, value] of Object.entries(filters)) {
      if (value.trim()) {
        params = params.set(name, value.trim());
      }
    }
    return this.http.get<TransactionPage>(API, { params });
  }

  create(data: TransactionData): Observable<Transaction> {
    return this.http.post<Transaction>(API, data);
  }

  update(id: string, data: TransactionData): Observable<Transaction> {
    return this.http.put<Transaction>(`${API}/${id}`, data);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }
}

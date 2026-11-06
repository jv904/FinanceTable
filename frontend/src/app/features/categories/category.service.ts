import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

const API = '/api/categories';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(API);
  }

  create(name: string, type: CategoryType): Observable<Category> {
    return this.http.post<Category>(API, { name, type });
  }

  rename(id: string, name: string): Observable<Category> {
    return this.http.put<Category>(`${API}/${id}`, { name });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }
}

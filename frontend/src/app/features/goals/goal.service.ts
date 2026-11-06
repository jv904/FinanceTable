import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  remainingAmount: number;
  progressPercent: number;
  /** Data no formato AAAA-MM-DD, sem horário nem fuso. */
  targetDate: string;
}

export interface GoalData {
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
}

const API = '/api/goals';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly http = inject(HttpClient);

  list(): Observable<Goal[]> {
    return this.http.get<Goal[]>(API);
  }

  create(data: GoalData): Observable<Goal> {
    return this.http.post<Goal>(API, data);
  }

  update(id: string, data: GoalData): Observable<Goal> {
    return this.http.put<Goal>(`${API}/${id}`, data);
  }

  addContribution(id: string, amount: number): Observable<Goal> {
    return this.http.post<Goal>(`${API}/${id}/contributions`, { amount });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }
}

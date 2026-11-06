import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, of, switchMap, tap } from 'rxjs';

export interface User {
  name: string;
  email: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface MessageResponse {
  message: string;
}

const API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /** Pergunta ao backend quem está logado. Também renova o cookie CSRF. */
  loadSession(): Promise<void> {
    return firstValueFrom(this.fetchCurrentUser().pipe(map(() => undefined)));
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<User>(`${API}/login`, { email, password })
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  register(data: RegisterData): Observable<string> {
    return this.http.post<MessageResponse>(`${API}/register`, data).pipe(map((res) => res.message));
  }

  forgotPassword(email: string): Observable<string> {
    return this.http
      .post<MessageResponse>(`${API}/forgot-password`, { email })
      .pipe(map((res) => res.message));
  }

  resetPassword(token: string, password: string, confirmPassword: string): Observable<string> {
    return this.http
      .post<MessageResponse>(`${API}/reset-password`, { token, password, confirmPassword })
      .pipe(
        map((res) => res.message),
        // A redefinição encerra todas as sessões, inclusive a deste navegador.
        tap(() => this.currentUser.set(null)),
      );
  }

  /**
   * O logout apaga o cookie CSRF. A consulta seguinte traz um novo, para que o próximo login
   * não seja recusado.
   */
  logout(): Observable<void> {
    return this.http.post<void>(`${API}/logout`, null).pipe(
      switchMap(() => this.fetchCurrentUser()),
      map(() => undefined),
    );
  }

  /** Esquece o usuário localmente, quando o backend avisa que a sessão acabou. */
  clearSession(): void {
    this.currentUser.set(null);
  }

  private fetchCurrentUser(): Observable<User | null> {
    return this.http.get<User>(`${API}/me`).pipe(
      catchError(() => of(null)),
      tap((user) => this.currentUser.set(user)),
    );
  }
}

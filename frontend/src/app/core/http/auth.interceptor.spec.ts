import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notification.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('volta para o login quando a sessão acaba durante o uso', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('maria@example.com', 'senha-segura-1').subscribe();
    http.expectOne('/api/auth/login').flush({ name: 'Maria', email: 'maria@example.com' });

    client.get('/api/movimentacoes').subscribe({ error: () => undefined });
    http.expectOne('/api/movimentacoes').flush({}, unauthorized);

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/entrar']);
    expect(TestBed.inject(NotificationService).error).toHaveBeenCalled();
  });

  it('não redireciona no 401 esperado das rotas de autenticação', () => {
    client.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    http.expectOne('/api/auth/login').flush({}, unauthorized);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('não redireciona em outros erros', () => {
    client.get('/api/movimentacoes').subscribe({ error: () => undefined });
    http.expectOne('/api/movimentacoes').flush({}, { status: 500, statusText: 'Server Error' });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('repassa o erro para quem fez a chamada', () => {
    let status = 0;
    client.post('/api/auth/login', {}).subscribe({ error: (error) => (status = error.status) });
    http.expectOne('/api/auth/login').flush({}, unauthorized);

    expect(status).toBe(401);
  });
});

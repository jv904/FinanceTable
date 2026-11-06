import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const maria = { name: 'Maria', email: 'maria@example.com' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fica autenticado quando já existe sessão', async () => {
    const loading = service.loadSession();
    http.expectOne('/api/auth/me').flush(maria);
    await loading;

    expect(service.user()).toEqual(maria);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('não falha ao iniciar sem sessão', async () => {
    const loading = service.loadSession();
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await loading;

    expect(service.isAuthenticated()).toBe(false);
  });

  it('guarda o usuário após o login', () => {
    service.login(maria.email, 'senha-segura-1').subscribe();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: maria.email, password: 'senha-segura-1' });
    request.flush(maria);

    expect(service.user()).toEqual(maria);
  });

  it('continua deslogado quando o login falha', () => {
    service.login(maria.email, 'errada').subscribe({ error: () => undefined });

    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('no logout, limpa o usuário e busca um novo cookie CSRF', () => {
    service.login(maria.email, 'senha-segura-1').subscribe();
    http.expectOne('/api/auth/login').flush(maria);

    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('limpa o usuário ao redefinir a senha, pois as sessões são encerradas', () => {
    service.login(maria.email, 'senha-segura-1').subscribe();
    http.expectOne('/api/auth/login').flush(maria);

    service.resetPassword('token', 'nova-senha-123', 'nova-senha-123').subscribe();
    http.expectOne('/api/auth/reset-password').flush({ message: 'ok' });

    expect(service.isAuthenticated()).toBe(false);
  });
});

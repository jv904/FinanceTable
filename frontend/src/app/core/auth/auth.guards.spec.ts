import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('guards de autenticação', () => {
  const route = {} as ActivatedRouteSnapshot;
  const stateAt = (url: string) => ({ url }) as RouterStateSnapshot;
  const run = (guard: typeof authGuard, url = '/inicio') =>
    TestBed.runInInjectionContext(() => guard(route, stateAt(url)));

  function logIn(): void {
    TestBed.inject(AuthService).login('maria@example.com', 'senha-segura-1').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/login')
      .flush({ name: 'Maria', email: 'maria@example.com' });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('authGuard leva ao login e lembra a página pedida', () => {
    const result = run(authGuard, '/metas') as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/entrar?returnUrl=%2Fmetas');
  });

  it('authGuard libera quem está logado', () => {
    logIn();

    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard libera quem não está logado', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it('guestGuard leva quem está logado para o início', () => {
    logIn();

    const result = run(guestGuard) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/inicio');
  });
});

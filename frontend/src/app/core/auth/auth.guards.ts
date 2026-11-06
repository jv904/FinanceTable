import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Área logada: sem sessão, leva ao login e lembra para onde o usuário queria ir. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) {
    return true;
  }
  const queryParams = state.url === '/' ? {} : { returnUrl: state.url };
  return inject(Router).createUrlTree(['/entrar'], { queryParams });
};

/** Telas de acesso: quem já está logado vai direto para o início. */
export const guestGuard: CanActivateFn = () => {
  return inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/inicio']) : true;
};

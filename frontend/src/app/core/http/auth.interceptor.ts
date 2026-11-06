import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notification.service';

/**
 * Se a sessão acabar durante o uso, volta para o login. As rotas de /api/auth ficam de fora porque
 * nelas o 401 é uma resposta esperada: login incorreto ou consulta feita sem sessão.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.startsWith('/api/auth/')) {
        auth.clearSession();
        notifications.error('Sua sessão terminou. Entre novamente.');
        void router.navigate(['/entrar']);
      }
      return throwError(() => error);
    }),
  );
};

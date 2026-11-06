import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';

function comingSoon(path: string, title: string, description: string) {
  return {
    path,
    title: `${title} · FinanceTable`,
    data: { heading: title, description },
    loadComponent: () => import('./features/coming-soon/coming-soon').then((m) => m.ComingSoon),
  };
}

export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Entrar · FinanceTable',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'cadastro',
    title: 'Criar conta · FinanceTable',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: 'esqueci-senha',
    title: 'Recuperar senha · FinanceTable',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    // Sem guarda: o link do e-mail precisa funcionar mesmo com outra sessão aberta.
    path: 'redefinir-senha',
    title: 'Redefinir senha · FinanceTable',
    loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      comingSoon('inicio', 'Início', 'Aqui você verá seu saldo, gráficos, últimas movimentações e metas.'),
      comingSoon('movimentacoes', 'Movimentações', 'Aqui você vai registrar e consultar suas receitas e despesas.'),
      comingSoon('categorias', 'Categorias', 'Aqui você vai organizar as categorias de receitas e despesas.'),
      comingSoon('metas', 'Metas', 'Aqui você vai planejar seus objetivos e acompanhar o progresso.'),
      comingSoon('relatorios', 'Relatórios', 'Aqui você vai analisar suas finanças por período e comparar meses.'),
      {
        path: 'perfil',
        title: 'Perfil · FinanceTable',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';

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
      {
        path: 'inicio',
        title: 'Início · FinanceTable',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'movimentacoes',
        title: 'Movimentações · FinanceTable',
        loadComponent: () => import('./features/transactions/transactions').then((m) => m.Transactions),
      },
      {
        path: 'categorias',
        title: 'Categorias · FinanceTable',
        loadComponent: () => import('./features/categories/categories').then((m) => m.Categories),
      },
      {
        path: 'metas',
        title: 'Metas · FinanceTable',
        loadComponent: () => import('./features/goals/goals').then((m) => m.Goals),
      },
      {
        path: 'relatorios',
        title: 'Relatórios · FinanceTable',
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'perfil',
        title: 'Perfil · FinanceTable',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'ajuda',
        title: 'Ajuda · FinanceTable',
        loadComponent: () => import('./features/help/help').then((m) => m.Help),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

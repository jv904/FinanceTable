import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import { Logo } from '../../shared/logo';

const NAV_ITEMS = [
  { path: '/inicio', label: 'Início', icon: 'home' },
  { path: '/movimentacoes', label: 'Movimentações', icon: 'swap_vert' },
  { path: '/categorias', label: 'Categorias', icon: 'category' },
  { path: '/metas', label: 'Metas', icon: 'flag' },
  { path: '/relatorios', label: 'Relatórios', icon: 'bar_chart' },
  { path: '/perfil', label: 'Perfil', icon: 'person' },
  { path: '/ajuda', label: 'Ajuda', icon: 'help' },
];

@Component({
  selector: 'app-shell',
  imports: [
    Logo,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav
        class="sidenav"
        [mode]="isDesktop() ? 'side' : 'over'"
        [opened]="isDesktop() || menuOpen()"
        [disableClose]="isDesktop()"
        (closedStart)="menuOpen.set(false)"
      >
        <div class="brand"><app-logo /></div>
        <mat-nav-list>
          @for (item of navItems; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive="active"
              #link="routerLinkActive"
              [activated]="link.isActive"
              (click)="menuOpen.set(false)"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
        <div class="footer">
          <p class="user-name">{{ firstName() }}</p>
          <button matButton="outlined" type="button" class="logout" [disabled]="leaving()" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Sair
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        @if (!isDesktop()) {
          <mat-toolbar class="topbar">
            <button matIconButton type="button" aria-label="Abrir menu" (click)="menuOpen.set(true)">
              <mat-icon>menu</mat-icon>
            </button>
            <app-logo [size]="28" />
          </mat-toolbar>
        }
        <main class="page"><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .container {
      height: 100dvh;
      background: var(--ft-surface-muted);
    }

    .sidenav {
      width: 256px;
      border-right: 1px solid var(--ft-border);
      border-radius: 0;
      background: #fff;
    }

    .sidenav ::ng-deep .mat-drawer-inner-container {
      display: flex;
      flex-direction: column;
    }

    .brand {
      padding: 20px 16px 12px;
    }

    mat-nav-list {
      flex: 1;
    }

    .footer {
      padding: 16px;
      border-top: 1px solid var(--ft-border);
    }

    .user-name {
      margin: 0 0 10px;
      overflow: hidden;
      color: var(--ft-text-muted);
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .logout {
      width: 100%;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 2;
      gap: 8px;
      padding: 0 8px;
      border-bottom: 1px solid var(--ft-border);
      background: #fff;
    }

    .page {
      box-sizing: border-box;
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    @media (max-width: 599px) {
      .page {
        padding: 20px 16px;
      }
    }
  `,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly menuOpen = signal(false);
  protected readonly leaving = signal(false);
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  protected readonly isDesktop = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 960px)')
      .pipe(map((state) => state.matches)),
    { initialValue: true },
  );

  protected logout(): void {
    this.leaving.set(true);
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/entrar']),
      error: (error: unknown) => {
        this.notifications.error(apiErrorMessage(error));
        this.leaving.set(false);
      },
    });
  }
}

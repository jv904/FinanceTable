import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import { CONFIRM_DIALOG_SIZE, ConfirmDeleteData, ConfirmDeleteDialog } from '../../shared/confirm-delete-dialog';
import { ContributionDialog } from './contribution-dialog';
import { GOAL_DIALOG_SIZE, GoalFormData, GoalFormDialog } from './goal-form-dialog';
import { GoalProgress } from './goal-progress';
import { Goal, GoalService } from './goal.service';

@Component({
  selector: 'app-goals',
  imports: [CurrencyPipe, DatePipe, GoalProgress, MatButtonModule, MatIconModule],
  template: `
    <header class="title">
      <h1>Metas</h1>
      <button matButton="filled" type="button" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Nova meta
      </button>
    </header>

    @if (loading()) {
      <p class="message" role="status">Carregando metas...</p>
    } @else if (loadError()) {
      <div class="panel load-error">
        <p class="ft-form-alert" role="alert">{{ loadError() }}</p>
        <button matButton="outlined" type="button" (click)="load()">Tentar novamente</button>
      </div>
    } @else if (!goals().length) {
      <p class="panel message">Nenhuma meta cadastrada.</p>
    } @else {
      <div class="grid">
        @for (goal of goals(); track goal.id) {
          <section class="panel goal">
            <h2>{{ goal.name }}</h2>

            <p class="amounts">
              <strong>{{ goal.savedAmount | currency: 'BRL' }}</strong>
              de {{ goal.targetAmount | currency: 'BRL' }}
            </p>

            <app-goal-progress [percent]="goal.progressPercent" [name]="goal.name" />

            <p class="progress">
              <strong>{{ goal.progressPercent }}%</strong>
              @if (goal.remainingAmount > 0) {
                <span>Falta {{ goal.remainingAmount | currency: 'BRL' }}</span>
              } @else {
                <span class="reached">
                  <mat-icon inline>check_circle</mat-icon>
                  Meta alcançada!
                </span>
              }
            </p>

            <p class="date">Data prevista: {{ goal.targetDate | date: 'dd/MM/yyyy' }}</p>

            <div class="actions">
              <button matButton="outlined" type="button" (click)="openContribution(goal)">Registrar valor</button>
              <span class="spacer"></span>
              <button matIconButton type="button" [attr.aria-label]="'Editar ' + goal.name" (click)="openEdit(goal)">
                <mat-icon>edit</mat-icon>
              </button>
              <button
                matIconButton
                type="button"
                [attr.aria-label]="'Excluir ' + goal.name"
                (click)="openDelete(goal)"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: `
    .title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
    }

    .panel {
      padding: 20px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
      gap: 16px;
      align-items: start;
    }

    .goal {
      min-width: 0;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .amounts {
      margin: 0 0 8px;
      color: var(--ft-text-muted);
      font-size: 14px;
    }

    .amounts strong {
      color: var(--mat-sys-on-surface);
      font-size: 18px;
      font-weight: 600;
    }

    .progress {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 4px 12px;
      margin: 8px 0 0;
      font-size: 14px;
    }

    .progress strong {
      font-weight: 600;
    }

    .reached {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--ft-brand);
      font-weight: 600;
    }

    .date {
      margin: 8px 0 0;
      color: var(--ft-text-muted);
      font-size: 13px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 12px;
    }

    .spacer {
      flex: 1;
    }

    .message {
      margin: 0;
      color: var(--ft-text-muted);
    }

    .load-error .ft-form-alert {
      margin-bottom: 12px;
    }
  `,
})
export class Goals implements OnInit {
  private readonly service = inject(GoalService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly goals = signal<Goal[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.service.list().subscribe({
      next: (goals) => {
        this.goals.set(goals);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.openForm({});
  }

  protected openEdit(goal: Goal): void {
    this.openForm({ goal });
  }

  protected openContribution(goal: Goal): void {
    this.dialog
      .open<ContributionDialog, Goal, Goal>(ContributionDialog, { ...CONFIRM_DIALOG_SIZE, data: goal })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.goals.update((list) => list.map((item) => (item.id === saved.id ? saved : item)));
          this.notifications.success('Valor registrado com sucesso!');
        }
      });
  }

  protected openDelete(goal: Goal): void {
    this.dialog
      .open<ConfirmDeleteDialog, ConfirmDeleteData, boolean>(ConfirmDeleteDialog, {
        ...CONFIRM_DIALOG_SIZE,
        data: {
          title: 'Excluir meta',
          message: `Deseja excluir a meta "${goal.name}"? Esta ação não pode ser desfeita.`,
          remove: () => this.service.remove(goal.id),
        },
      })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          this.goals.update((list) => list.filter((item) => item.id !== goal.id));
          this.notifications.success('Meta excluída com sucesso!');
        }
      });
  }

  /** Recarrega a lista, porque criar ou mudar a data altera a ordem, que é definida pelo backend. */
  private openForm(data: GoalFormData): void {
    this.dialog
      .open<GoalFormDialog, GoalFormData, Goal>(GoalFormDialog, { ...GOAL_DIALOG_SIZE, data })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.notifications.success('Meta salva com sucesso!');
          this.load();
        }
      });
  }
}

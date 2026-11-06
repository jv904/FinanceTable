import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/notifications/notification.service';
import { CONFIRM_DIALOG_SIZE, ConfirmDeleteData, ConfirmDeleteDialog } from '../../shared/confirm-delete-dialog';
import { CategoryFormData, CategoryFormDialog } from './category-form-dialog';
import { Category, CategoryService, CategoryType } from './category.service';

const SECTIONS: { type: CategoryType; title: string; cssClass: string }[] = [
  { type: 'INCOME', title: 'Categorias de receitas', cssClass: 'income' },
  { type: 'EXPENSE', title: 'Categorias de despesas', cssClass: 'expense' },
];

function byName(a: Category, b: Category): number {
  return a.name.localeCompare(b.name, 'pt-BR');
}

@Component({
  selector: 'app-categories',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <h1>Categorias</h1>

    @if (loading()) {
      <p class="message" role="status">Carregando categorias...</p>
    } @else if (loadError()) {
      <div class="panel load-error">
        <p class="ft-form-alert" role="alert">{{ loadError() }}</p>
        <button matButton="outlined" type="button" (click)="load()">Tentar novamente</button>
      </div>
    } @else {
      <div class="sections">
        @for (section of sections(); track section.type) {
          <section class="panel" [class]="section.cssClass">
            <header>
              <h2>{{ section.title }}</h2>
              <button matButton="outlined" type="button" (click)="openCreate(section.type)">
                <mat-icon>add</mat-icon>
                Nova categoria
              </button>
            </header>

            @if (section.items.length) {
              <ul>
                @for (category of section.items; track category.id) {
                  <li>
                    <span class="name">{{ category.name }}</span>
                    <button
                      matIconButton
                      type="button"
                      [attr.aria-label]="'Editar ' + category.name"
                      (click)="openRename(category)"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      matIconButton
                      type="button"
                      [attr.aria-label]="'Excluir ' + category.name"
                      (click)="openDelete(category)"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="message">Nenhuma categoria cadastrada.</p>
            }
          </section>
        }
      </div>
    }
  `,
  styles: `
    h1 {
      margin: 0 0 20px;
      font-size: 26px;
      font-weight: 600;
    }

    .sections {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 799px) {
      .sections {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    .panel {
      padding: 20px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    .income {
      border-top: 4px solid var(--ft-income);
    }

    .expense {
      border-top: 4px solid var(--ft-expense);
    }

    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      align-items: center;
      border-top: 1px solid var(--ft-border);
    }

    .name {
      flex: 1;
      min-width: 0;
      padding: 8px 8px 8px 0;
      overflow-wrap: anywhere;
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
export class Categories implements OnInit {
  private readonly service = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  private readonly categories = signal<Category[]>([]);

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly sections = computed(() =>
    SECTIONS.map((section) => ({
      ...section,
      items: this.categories()
        .filter((category) => category.type === section.type)
        .sort(byName),
    })),
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.service.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected openCreate(type: CategoryType): void {
    this.openForm({ type });
  }

  protected openRename(category: Category): void {
    this.openForm({ type: category.type, category });
  }

  protected openDelete(category: Category): void {
    this.dialog
      .open<ConfirmDeleteDialog, ConfirmDeleteData, boolean>(ConfirmDeleteDialog, {
        ...CONFIRM_DIALOG_SIZE,
        data: {
          title: 'Excluir categoria',
          message: `Deseja excluir a categoria "${category.name}"? Esta ação não pode ser desfeita.`,
          remove: () => this.service.remove(category.id),
        },
      })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          this.categories.update((list) => list.filter((item) => item.id !== category.id));
          this.notifications.success('Categoria excluída com sucesso!');
        }
      });
  }

  private openForm(data: CategoryFormData): void {
    this.dialog
      .open<CategoryFormDialog, CategoryFormData, Category>(CategoryFormDialog, { ...CONFIRM_DIALOG_SIZE, data })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.categories.update((list) => [...list.filter((item) => item.id !== saved.id), saved]);
          this.notifications.success('Categoria salva com sucesso!');
        }
      });
  }
}

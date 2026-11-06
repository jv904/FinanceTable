import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { Profile } from './profile';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const notifications = { success: vi.fn(), error: vi.fn() };

  function input(name: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
  }

  function type(name: string, value: string): void {
    const field = input(name);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
  }

  async function submit(index: number): Promise<void> {
    element.querySelectorAll('form')[index].dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const fillPassword = (current: string, password: string, confirm: string) => {
    type('currentPassword', current);
    type('password', password);
    type('confirmPassword', confirm);
  };

  beforeEach(async () => {
    notifications.success.mockReset();
    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpTestingController);

    const auth = TestBed.inject(AuthService);
    const session = auth.loadSession();
    http.expectOne('/api/auth/me').flush({ name: 'Maria', email: 'maria@example.com' });
    await session;

    fixture = TestBed.createComponent(Profile);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('mostra o e-mail só para consulta e o nome para editar', () => {
    expect(element.textContent).toContain('maria@example.com');
    expect(input('email')).toBeNull();
    expect(input('name').value).toBe('Maria');
  });

  it('salva o nome e atualiza o usuário da sessão', async () => {
    type('name', 'Maria Silva');
    await submit(0);

    const request = http.expectOne('/api/auth/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Maria Silva' });
    request.flush({ name: 'Maria Silva', email: 'maria@example.com' });
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).user()?.name).toBe('Maria Silva');
    expect(notifications.success).toHaveBeenCalledWith('Nome salvo com sucesso!');
  });

  it('não envia um nome só com espaços', async () => {
    type('name', '   ');
    await submit(0);

    expect(element.textContent).toContain('Informe seu nome.');
  });

  it('mostra o erro do backend ao salvar o nome e libera o botão', async () => {
    type('name', 'Maria Silva');
    await submit(0);

    http.expectOne('/api/auth/me').flush(
      { detail: 'Não foi possível concluir a ação. Tente novamente.' },
      { status: 500, statusText: 'Erro' },
    );
    await fixture.whenStable();

    expect(element.querySelector('[role=alert]')!.textContent).toContain('Não foi possível concluir a ação.');
    expect(element.querySelectorAll<HTMLButtonElement>('button[type=submit]')[0].disabled).toBe(false);
  });

  it('altera a senha e limpa os campos, sem marcá-los como erro', async () => {
    fillPassword('senha-atual-1', 'senha-nova-22', 'senha-nova-22');
    await submit(1);

    const request = http.expectOne('/api/auth/change-password');
    expect(request.request.body).toEqual({
      currentPassword: 'senha-atual-1',
      password: 'senha-nova-22',
      confirmPassword: 'senha-nova-22',
    });
    request.flush({ message: 'Senha alterada com sucesso!' });
    await fixture.whenStable();

    expect(notifications.success).toHaveBeenCalledWith('Senha alterada com sucesso!');
    expect(input('currentPassword').value).toBe('');
    expect(input('password').value).toBe('');
    expect(input('confirmPassword').value).toBe('');
    expect(element.querySelector('mat-error')).toBeNull();
  });

  it('não envia senhas diferentes nem curtas', async () => {
    fillPassword('senha-atual-1', 'senha-nova-22', 'outra-senha-33');
    await submit(1);
    expect(element.textContent).toContain('As senhas informadas não são iguais.');

    fillPassword('senha-atual-1', 'curta', 'curta');
    await submit(1);
    expect(element.textContent).toContain('A senha deve ter entre 8 e 72 caracteres.');
  });

  it('mostra quando a senha atual está errada e mantém o que foi digitado', async () => {
    fillPassword('senha-errada-1', 'senha-nova-22', 'senha-nova-22');
    await submit(1);

    http.expectOne('/api/auth/change-password').flush(
      { detail: 'A senha atual está incorreta.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    expect(element.querySelector('[role=alert]')!.textContent).toContain('A senha atual está incorreta.');
    expect(input('password').value).toBe('senha-nova-22');
    expect(notifications.success).not.toHaveBeenCalled();
  });
});

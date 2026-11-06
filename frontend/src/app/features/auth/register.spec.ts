import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { NotificationService } from '../../core/notifications/notification.service';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Register);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function fill(values: { name: string; email: string; password: string; confirmPassword: string }): void {
    for (const [name, value] of Object.entries(values)) {
      const input = element.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const valid = {
    name: 'Maria',
    email: 'maria@example.com',
    password: 'senha-segura-1',
    confirmPassword: 'senha-segura-1',
  };

  it('com campos vazios, avisa e não chama a API', async () => {
    await submit();

    expect(element.textContent).toContain('Preencha todos os campos obrigatórios.');
    http.expectNone('/api/auth/register');
  });

  it('com senhas diferentes, avisa e não chama a API', async () => {
    fill({ ...valid, confirmPassword: 'outra-senha-1' });
    await submit();

    expect(element.textContent).toContain('As senhas informadas não são iguais.');
    http.expectNone('/api/auth/register');
  });

  it('com e-mail inválido, não chama a API', async () => {
    fill({ ...valid, email: 'nao-e-email' });
    await submit();

    http.expectNone('/api/auth/register');
  });

  it('com dados válidos, cria a conta e vai para o login', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(valid);
    await submit();

    const request = http.expectOne('/api/auth/register');
    expect(request.request.body).toEqual(valid);
    request.flush({ message: 'Conta criada com sucesso!' }, { status: 201, statusText: 'Created' });

    expect(TestBed.inject(NotificationService).success).toHaveBeenCalledWith('Conta criada com sucesso!');
    expect(navigate).toHaveBeenCalledWith(['/entrar']);
  });

  it('mostra a mensagem do backend quando o e-mail já existe', async () => {
    fill(valid);
    await submit();

    http
      .expectOne('/api/auth/register')
      .flush({ detail: 'Este e-mail já está cadastrado.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(element.textContent).toContain('Este e-mail já está cadastrado.');
  });
});

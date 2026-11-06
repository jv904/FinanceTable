import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../../app.routes';
import { Help } from './help';

describe('Help', () => {
  let fixture: ComponentFixture<Help>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Help], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Help);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('explica cada área da plataforma', () => {
    const titles = Array.from(element.querySelectorAll('h2')).map((title) => title.textContent);

    expect(titles).toEqual([
      'Primeiros passos',
      'Receitas e despesas',
      'Categorias',
      'Metas',
      'Relatórios e planilha',
      'Conta e segurança',
    ]);
  });

  it('só aponta para rotas que existem', () => {
    const paths = routes.find((route) => route.path === '' && route.children)!.children!.map((route) => route.path);
    const links = Array.from(element.querySelectorAll('a')).map((link) => link.getAttribute('href')!.slice(1));

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(paths).toContain(link);
    }
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista as categorias', () => {
    service.list().subscribe();
    expect(http.expectOne('/api/categories').request.method).toBe('GET');
  });

  it('cria com nome e tipo', () => {
    service.create('Freelance', 'INCOME').subscribe();

    const request = http.expectOne('/api/categories').request;
    expect(request.method).toBe('POST');
    expect(request.body).toEqual({ name: 'Freelance', type: 'INCOME' });
  });

  it('renomeia enviando só o nome', () => {
    service.rename('abc', 'Novo nome').subscribe();

    const request = http.expectOne('/api/categories/abc').request;
    expect(request.method).toBe('PUT');
    expect(request.body).toEqual({ name: 'Novo nome' });
  });

  it('exclui pelo id', () => {
    service.remove('abc').subscribe();
    expect(http.expectOne('/api/categories/abc').request.method).toBe('DELETE');
  });
});

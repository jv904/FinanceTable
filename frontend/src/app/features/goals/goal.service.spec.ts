import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GoalData, GoalService } from './goal.service';

const DATA: GoalData = { name: 'Viagem', targetAmount: 5000, savedAmount: 0, targetDate: '2027-06-30' };

describe('GoalService', () => {
  let service: GoalService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GoalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista, cria, edita e exclui nas rotas certas', () => {
    service.list().subscribe();
    expect(http.expectOne('/api/goals').request.method).toBe('GET');

    service.create(DATA).subscribe();
    const created = http.expectOne('/api/goals').request;
    expect(created.method).toBe('POST');
    expect(created.body).toEqual(DATA);

    service.update('g1', DATA).subscribe();
    expect(http.expectOne('/api/goals/g1').request.method).toBe('PUT');

    service.remove('g1').subscribe();
    expect(http.expectOne('/api/goals/g1').request.method).toBe('DELETE');
  });

  it('registra valor enviando só a quantia', () => {
    service.addContribution('g1', 150.5).subscribe();

    const request = http.expectOne('/api/goals/g1/contributions').request;
    expect(request.method).toBe('POST');
    expect(request.body).toEqual({ amount: 150.5 });
  });
});

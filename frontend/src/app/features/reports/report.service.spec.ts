import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta o período informado', () => {
    service.get('2026-03-01', '2026-03-31').subscribe();

    const request = http.expectOne((r) => r.url === '/api/reports');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-03-01');
    expect(request.request.params.get('to')).toBe('2026-03-31');
    request.flush({});
  });

  it('baixa a exportação como arquivo', () => {
    service.export('2026-03-01', '2026-03-31').subscribe();

    const request = http.expectOne((r) => r.url === '/api/reports/export');
    expect(request.request.responseType).toBe('blob');
    expect(request.request.params.get('from')).toBe('2026-03-01');
    expect(request.request.params.get('to')).toBe('2026-03-31');
    request.flush(new Blob(['csv']));
  });
});

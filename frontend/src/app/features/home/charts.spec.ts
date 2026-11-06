import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryBars, shareText } from './category-bars';
import { ComparisonBars } from './comparison-bars';
import { ExpenseTrend, niceMax } from './expense-trend';

registerLocaleData(localePt);

const text = (element: HTMLElement) => element.textContent!.replace(/\s+/g, ' ');

function setup(): void {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }] });
}

describe('ComparisonBars', () => {
  async function render(income: number, expense: number): Promise<HTMLElement> {
    setup();
    const fixture = TestBed.createComponent(ComparisonBars);
    fixture.componentRef.setInput('income', income);
    fixture.componentRef.setInput('expense', expense);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('mostra nome e valor, com o maior valor como referência da escala', async () => {
    const element = await render(2000, 500);

    expect(text(element)).toMatch(/Receitas\s*R\$\s2\.000,00/);
    expect(text(element)).toMatch(/Despesas\s*R\$\s500,00/);
    expect(element.querySelector<HTMLElement>('.income')!.style.width).toBe('100%');
    expect(element.querySelector<HTMLElement>('.expense')!.style.width).toBe('25%');
  });

  it('com despesa maior, a escala acompanha', async () => {
    const element = await render(500, 1000);

    expect(element.querySelector<HTMLElement>('.income')!.style.width).toBe('50%');
    expect(element.querySelector<HTMLElement>('.expense')!.style.width).toBe('100%');
  });

  it('sem valores, avisa em vez de dividir por zero', async () => {
    const element = await render(0, 0);

    expect(text(element)).toContain('Nenhuma movimentação neste mês.');
    expect(element.querySelector('.bar')).toBeNull();
  });

  it('aceita outro aviso, para períodos que não são um mês', async () => {
    setup();
    const fixture = TestBed.createComponent(ComparisonBars);
    fixture.componentRef.setInput('income', 0);
    fixture.componentRef.setInput('expense', 0);
    fixture.componentRef.setInput('emptyMessage', 'Nenhuma movimentação neste período.');
    await fixture.whenStable();

    expect(text(fixture.nativeElement)).toContain('Nenhuma movimentação neste período.');
  });
});

describe('CategoryBars', () => {
  it('mostra valor e porcentagem, com a maior categoria ocupando a largura toda', async () => {
    setup();
    const fixture = TestBed.createComponent(CategoryBars);
    fixture.componentRef.setInput('categories', [
      { categoryId: '1', name: 'Moradia', amount: 750 },
      { categoryId: '2', name: 'Lazer', amount: 250 },
    ]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    const rows = Array.from(element.querySelectorAll('li')).map((row) => text(row as HTMLElement));
    expect(rows[0]).toMatch(/Moradia.*R\$\s750,00.*75%/);
    expect(rows[1]).toMatch(/Lazer.*R\$\s250,00.*25%/);
    const bars = element.querySelectorAll<HTMLElement>('.bar');
    expect(bars[0].style.width).toBe('100%');
    expect(bars[1].style.width).toBe(`${(250 / 750) * 100}%`);
  });

  it('sem despesas, avisa', async () => {
    setup();
    const fixture = TestBed.createComponent(CategoryBars);
    fixture.componentRef.setInput('categories', []);
    await fixture.whenStable();

    expect(text(fixture.nativeElement)).toContain('Nenhuma despesa neste mês.');
  });

  it('aceita outro aviso, para períodos que não são um mês', async () => {
    setup();
    const fixture = TestBed.createComponent(CategoryBars);
    fixture.componentRef.setInput('categories', []);
    fixture.componentRef.setInput('emptyMessage', 'Nenhuma despesa neste período.');
    await fixture.whenStable();

    expect(text(fixture.nativeElement)).toContain('Nenhuma despesa neste período.');
  });

  it('uma fatia muito pequena não aparece como zero', () => {
    expect(shareText(1, 1000)).toBe('< 1%');
    expect(shareText(1000, 1000)).toBe('100%');
    expect(shareText(1, 3)).toBe('33%');
  });
});

describe('niceMax', () => {
  it.each([
    [0, 0],
    [0.1, 2],
    [1, 2],
    [100, 200],
    [500, 800],
    [1250.5, 2000],
    [7000, 8000],
    [8000, 8000],
    [8001, 20000],
  ])('para %d, usa %d no topo do eixo', (value, expected) => {
    const result = niceMax(value);
    expect(result).toBeGreaterThanOrEqual(value);
    expect(result).toBe(expected);
  });
});

describe('ExpenseTrend', () => {
  const MONTHS = [
    { month: '2026-10', amount: 100 },
    { month: '2026-11', amount: 0 },
    { month: '2026-12', amount: 400 },
    { month: '2027-01', amount: 200 },
    { month: '2027-02', amount: 0 },
    { month: '2027-03', amount: 300 },
  ];
  let fixture: ComponentFixture<ExpenseTrend>;
  let element: HTMLElement;

  async function render(months = MONTHS, selected = '2027-03'): Promise<void> {
    setup();
    fixture = TestBed.createComponent(ExpenseTrend);
    fixture.componentRef.setInput('months', months);
    fixture.componentRef.setInput('selected', selected);
    await fixture.whenStable();
    element = fixture.nativeElement;
  }

  it('desenha um ponto por mês, com o mês escolhido em destaque', async () => {
    await render(MONTHS, '2026-12');

    const dots = element.querySelectorAll('circle');
    expect(dots).toHaveLength(6);
    expect(element.querySelectorAll('circle.selected')).toHaveLength(1);
    expect(dots[2].classList).toContain('selected');
    expect(text(element)).toContain('dez');
  });

  it('coloca o maior valor mais alto e o zero na base', async () => {
    await render();

    const y = Array.from(element.querySelectorAll('circle')).map((dot) => Number(dot.getAttribute('cy')));
    expect(y[2]).toBeLessThan(y[5]);
    expect(y[1]).toBe(240 - 28);
    expect(y[4]).toBe(240 - 28);
  });

  it('todos os valores aparecem na tabela, sem depender do mouse', async () => {
    await render();

    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) => text(row as HTMLElement));
    expect(rows).toHaveLength(6);
    expect(rows[2]).toMatch(/dezembro de 2026\s?R\$\s400,00/);
    expect(rows[5]).toMatch(/março de 2027\s?R\$\s300,00/);
  });

  it('pelo teclado, percorre os meses e mostra o valor, sem passar das pontas', async () => {
    await render();
    const svg = element.querySelector('svg')!;
    const press = async (key: string) => {
      svg.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
      await fixture.whenStable();
    };

    svg.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(text(element.querySelector('.tooltip')!)).toMatch(/R\$\s300,00\s*março de 2027/);

    await press('ArrowRight');
    expect(text(element.querySelector('.tooltip')!)).toContain('março de 2027');

    await press('ArrowLeft');
    expect(text(element.querySelector('.tooltip')!)).toMatch(/R\$\s0,00\s*fevereiro de 2027/);

    svg.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(element.querySelector('.tooltip')).toBeNull();
  });

  it('descreve os valores para leitores de tela', async () => {
    await render();

    const label = element.querySelector('svg')!.getAttribute('aria-label')!;
    expect(label).toContain('dezembro de 2026');
    expect(label).toMatch(/R\$\s400,00/);
  });

  it('sem despesas nos 6 meses, avisa em vez de desenhar um gráfico vazio', async () => {
    await render(MONTHS.map((month) => ({ ...month, amount: 0 })));

    expect(text(element)).toContain('Nenhuma despesa nos últimos 6 meses.');
    expect(element.querySelector('svg')).toBeNull();
  });

  it('esconde a própria tabela quando a tela já mostra os valores em outra', async () => {
    setup();
    fixture = TestBed.createComponent(ExpenseTrend);
    fixture.componentRef.setInput('months', MONTHS);
    fixture.componentRef.setInput('selected', '2027-03');
    fixture.componentRef.setInput('showTable', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('details')).toBeNull();
    expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
  });

  it('aceita outro aviso, para períodos que não são de 6 meses', async () => {
    setup();
    fixture = TestBed.createComponent(ExpenseTrend);
    fixture.componentRef.setInput('months', [{ month: '2026-10', amount: 0 }]);
    fixture.componentRef.setInput('selected', '2026-10');
    fixture.componentRef.setInput('emptyMessage', 'Nenhuma despesa neste período.');
    await fixture.whenStable();

    expect(text(fixture.nativeElement)).toContain('Nenhuma despesa neste período.');
  });
});

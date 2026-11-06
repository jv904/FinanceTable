import { amountProblem, formatAmount, parseAmount } from './amount';

describe('parseAmount', () => {
  it.each([
    ['1.250,50', 1250.5],
    ['1250,50', 1250.5],
    ['1250.50', 1250.5],
    ['1.250', 1250],
    ['1.000.000,00', 1000000],
    ['1250', 1250],
    ['0,5', 0.5],
    ['1.5', 1.5],
    ['  R$ 150,00 ', 150],
    ['999.999.999.999,99', 999999999999.99],
  ])('lê "%s" como %d', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(['', 'abc', '-10', '1,234', '1.25.3', '12.34,56', '1,2,3', '1.250.5', '10,', '1e5'])(
    'recusa "%s"',
    (text) => {
      expect(parseAmount(text)).toBeNull();
    },
  );
});

describe('amountProblem', () => {
  it('aceita um valor válido', () => {
    expect(amountProblem('1.250,50')).toBeNull();
    expect(amountProblem('0,01')).toBeNull();
    expect(amountProblem('999.999.999.999,99')).toBeNull();
  });

  it('explica cada problema', () => {
    expect(amountProblem('  ')).toBe('Preencha todos os campos obrigatórios.');
    expect(amountProblem('abc')).toBe('Informe um valor válido, como 1.250,50.');
    expect(amountProblem('0')).toBe('Informe um valor maior que zero.');
    expect(amountProblem('0,00')).toBe('Informe um valor maior que zero.');
    expect(amountProblem('1.000.000.000.000,00')).toBe('O valor é maior do que o permitido.');
  });
});

describe('formatAmount', () => {
  it('usa o formato brasileiro, e o resultado pode ser lido de volta', () => {
    expect(formatAmount(1250.5)).toBe('1.250,50');
    expect(formatAmount(0.1)).toBe('0,10');
    expect(parseAmount(formatAmount(999999999999.99))).toBe(999999999999.99);
  });
});

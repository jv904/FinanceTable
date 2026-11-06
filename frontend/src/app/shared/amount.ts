const MAX_AMOUNT = 999_999_999_999.99;

const WITH_COMMA = /^(\d{1,3}(\.\d{3})+|\d+),\d{1,2}$/;
const THOUSANDS_ONLY = /^\d{1,3}(\.\d{3})+$/;
const PLAIN = /^\d+(\.\d{1,2})?$/;

/**
 * Lê um valor digitado como "1.250,50", "1250,50", "1.250" ou "1250.50".
 * Devolve null se não for um valor em reais válido. "1.250" é mil duzentos e cinquenta, como no Brasil.
 */
export function parseAmount(text: string): number | null {
  const value = text.trim().replace(/^R\$\s*/i, '');
  if (WITH_COMMA.test(value)) {
    return Number(value.replaceAll('.', '').replace(',', '.'));
  }
  if (THOUSANDS_ONLY.test(value)) {
    return Number(value.replaceAll('.', ''));
  }
  return PLAIN.test(value) ? Number(value) : null;
}

/** Explica o que há de errado com o valor digitado, ou devolve null se ele puder ser salvo. */
export function amountProblem(text: string): string | null {
  if (!text.trim()) {
    return 'Preencha todos os campos obrigatórios.';
  }
  const amount = parseAmount(text);
  if (amount === null) {
    return 'Informe um valor válido, como 1.250,50.';
  }
  if (amount === 0) {
    return 'Informe um valor maior que zero.';
  }
  return amount > MAX_AMOUNT ? 'O valor é maior do que o permitido.' : null;
}

/** Para campos em que vazio e zero são válidos, como o valor já guardado de uma meta. */
export function optionalAmountProblem(text: string): string | null {
  if (!text.trim()) {
    return null;
  }
  const amount = parseAmount(text);
  if (amount === null) {
    return 'Informe um valor válido, como 1.250,50.';
  }
  return amount > MAX_AMOUNT ? 'O valor é maior do que o permitido.' : null;
}

/** Formata para o campo de edição, sem o símbolo da moeda: 1250.5 vira "1.250,50". */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Funções sobre meses no formato AAAA-MM, sempre no fuso do usuário. */

function toDate(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1);
}

function toMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(): string {
  return toMonth(new Date());
}

export function shiftMonth(month: string, delta: number): string {
  const date = toDate(month);
  date.setMonth(date.getMonth() + delta);
  return toMonth(date);
}

/** "novembro de 2026" */
export function monthTitle(month: string): string {
  return toDate(month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** "nov", sem o ponto que o português põe nas abreviações. */
export function monthShort(month: string): string {
  return toDate(month).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

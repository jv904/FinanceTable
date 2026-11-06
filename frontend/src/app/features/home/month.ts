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

/** Primeiro dia do mês, no formato AAAA-MM-DD. */
export function firstDay(month: string): string {
  return `${month}-01`;
}

/** Último dia do mês, no formato AAAA-MM-DD. */
export function lastDay(month: string): string {
  const date = toDate(month);
  const day = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return `${month}-${String(day).padStart(2, '0')}`;
}

/** Os últimos meses até o informado, do mais recente para o mais antigo. */
export function lastMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(month, -index));
}

/** "novembro de 2026" */
export function monthTitle(month: string): string {
  return toDate(month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** "nov", sem o ponto que o português põe nas abreviações. */
export function monthShort(month: string): string {
  return toDate(month).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

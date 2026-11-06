import { HttpErrorResponse } from '@angular/common/http';

const CONNECTION_ERROR = 'Não foi possível conectar ao servidor. Tente novamente.';
const GENERIC_ERROR = 'Não foi possível concluir a ação. Tente novamente.';

/** Traduz uma falha da API na mensagem que será mostrada ao usuário. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return GENERIC_ERROR;
  }
  if (error.status === 0) {
    return CONNECTION_ERROR;
  }
  const detail = (error.error as { detail?: unknown } | null)?.detail;
  return typeof detail === 'string' && detail ? detail : GENERIC_ERROR;
}

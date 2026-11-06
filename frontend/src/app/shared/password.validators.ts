import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const MIN_LENGTH = 8;
/** Mesmo limite do backend: o BCrypt aceita até 72 bytes, e acentos ocupam mais de um. */
const MAX_BYTES = 72;

export const PASSWORD_LENGTH_MESSAGE = 'A senha deve ter entre 8 e 72 caracteres.';
export const PASSWORD_MISMATCH_MESSAGE = 'As senhas informadas não são iguais.';

export const passwordLength: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) {
    return null; // Campo vazio é tratado pelo Validators.required.
  }
  const tooLong = new TextEncoder().encode(value).length > MAX_BYTES;
  return value.length < MIN_LENGTH || tooLong ? { passwordLength: true } : null;
};

/** Valida o formulário inteiro: compara os campos `password` e `confirmPassword`. */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const confirm = group.get('confirmPassword')?.value;
  return confirm && group.get('password')?.value !== confirm ? { passwordMismatch: true } : null;
};

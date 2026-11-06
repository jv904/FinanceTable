import { FormControl, FormGroup } from '@angular/forms';

import { passwordLength, passwordsMatch } from './password.validators';

describe('passwordLength', () => {
  const check = (value: string) => passwordLength(new FormControl(value));

  it('ignora o campo vazio, que é tratado como obrigatório', () => {
    expect(check('')).toBeNull();
  });

  it('recusa menos de 8 caracteres', () => {
    expect(check('1234567')).toEqual({ passwordLength: true });
  });

  it('aceita de 8 a 72 caracteres', () => {
    expect(check('12345678')).toBeNull();
    expect(check('x'.repeat(72))).toBeNull();
  });

  it('recusa mais de 72 caracteres', () => {
    expect(check('x'.repeat(73))).toEqual({ passwordLength: true });
  });

  it('conta bytes, como o backend: 72 letras acentuadas excedem o limite', () => {
    expect(check('á'.repeat(72))).toEqual({ passwordLength: true });
  });
});

describe('passwordsMatch', () => {
  const check = (password: string, confirmPassword: string) =>
    passwordsMatch(
      new FormGroup({ password: new FormControl(password), confirmPassword: new FormControl(confirmPassword) }),
    );

  it('aceita senhas iguais', () => {
    expect(check('senha-segura-1', 'senha-segura-1')).toBeNull();
  });

  it('recusa senhas diferentes', () => {
    expect(check('senha-segura-1', 'outra')).toEqual({ passwordMismatch: true });
  });

  it('não acusa diferença antes de preencher a confirmação', () => {
    expect(check('senha-segura-1', '')).toBeNull();
  });
});

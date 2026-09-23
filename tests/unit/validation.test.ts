import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidUsername,
  normalizeUsername,
  passwordIssues,
} from '../../supabase/functions/_shared/validation.ts';

describe('validación compartida', () => {
  it('usuario', () => {
    expect(isValidUsername('zhu.yan_1')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('con espacio')).toBe(false);
    expect(isValidUsername('x'.repeat(33))).toBe(false);
    expect(normalizeUsername('  LiMing ')).toBe('liming');
  });

  it('correo', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });

  it('contraseña: longitud, mayúsculas, minúsculas y dígitos', () => {
    expect(passwordIssues('Correct-Horse-9')).toEqual([]);
    expect(passwordIssues('corta1A')).toEqual(['too_short']);
    expect(passwordIssues('todo-minusculas-1')).toEqual(['needs_upper']);
    expect(passwordIssues('TODO-MAYUSCULAS-1')).toEqual(['needs_lower']);
    expect(passwordIssues('Sin-Digitos-Aqui')).toEqual(['needs_digit']);
    expect(passwordIssues('x'.repeat(129) + 'A1')).toContain('too_long');
    expect(passwordIssues('ZhuyanZhuyan1', 'zhuyanzhuyan1')).toContain('same_as_username');
  });
});

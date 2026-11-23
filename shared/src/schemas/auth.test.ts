import { describe, expect, it } from 'vitest';
import { loginInputSchema, publicUserSchema, registerInputSchema } from './auth.js';

const validRegister = {
  username: 'speedy_kim',
  email: 'kim@example.com',
  password: 'correct horse',
};

describe('registerInputSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerInputSchema.parse(validRegister)).toEqual(validRegister);
  });

  it('trims and lowercases the email', () => {
    const parsed = registerInputSchema.parse({ ...validRegister, email: '  Kim@Example.COM ' });
    expect(parsed.email).toBe('kim@example.com');
  });

  it('rejects an invalid email', () => {
    const result = registerInputSchema.safeParse({ ...validRegister, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an email longer than 254 characters', () => {
    const email = `${'a'.repeat(250)}@x.io`;
    expect(registerInputSchema.safeParse({ ...validRegister, email }).success).toBe(false);
  });

  it.each([
    ['7 chars', 'x'.repeat(7), false],
    ['8 chars', 'x'.repeat(8), true],
    ['72 chars', 'x'.repeat(72), true],
    ['73 chars', 'x'.repeat(73), false],
  ])('password of %s → valid=%s', (_label, password, valid) => {
    expect(registerInputSchema.safeParse({ ...validRegister, password }).success).toBe(valid);
  });

  it('rejects an invalid username and reports the field', () => {
    const result = registerInputSchema.safeParse({ ...validRegister, username: 'no spaces' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['username']);
  });

  it('rejects missing fields', () => {
    expect(registerInputSchema.safeParse({ username: 'abc' }).success).toBe(false);
  });
});

describe('loginInputSchema', () => {
  it('accepts a username or an email as identifier', () => {
    expect(loginInputSchema.safeParse({ identifier: 'speedy_kim', password: 'x' }).success).toBe(
      true,
    );
    expect(
      loginInputSchema.safeParse({ identifier: 'kim@example.com', password: 'x' }).success,
    ).toBe(true);
  });

  it('rejects an empty identifier or password', () => {
    expect(loginInputSchema.safeParse({ identifier: '  ', password: 'x' }).success).toBe(false);
    expect(loginInputSchema.safeParse({ identifier: 'kim', password: '' }).success).toBe(false);
  });
});

describe('publicUserSchema', () => {
  const user = {
    id: '6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f',
    username: 'speedy_kim',
    createdAt: '2026-11-28T18:22:10.000Z',
  };

  it('accepts the public user shape', () => {
    expect(publicUserSchema.parse(user)).toEqual(user);
  });

  it('strips unknown fields such as passwordHash', () => {
    expect(publicUserSchema.parse({ ...user, passwordHash: 'secret' })).toEqual(user);
  });

  it('rejects a non-ISO createdAt', () => {
    expect(publicUserSchema.safeParse({ ...user, createdAt: 'yesterday' }).success).toBe(false);
  });
});

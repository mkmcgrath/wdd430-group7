import { z } from 'zod';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants.js';
import { isoDateTimeSchema, nameSchema, uuidSchema } from './common.js';

/** Email is trimmed and lowercased (§5.1: stored lowercased). */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, `Email must be at most ${String(EMAIL_MAX_LENGTH)} characters`)
  .pipe(z.email('Enter a valid email address'));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${String(PASSWORD_MIN_LENGTH)} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${String(PASSWORD_MAX_LENGTH)} characters`);

/** `POST /auth/register` body (§13.2). */
export const registerInputSchema = z.object({
  username: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/** `POST /auth/login` body. `identifier` is a username or an email (§5.1). */
export const loginInputSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username or email').max(EMAIL_MAX_LENGTH),
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
});

/** The only user shape any API returns (§12.3). Never includes the password hash. */
export const publicUserSchema = z.object({
  id: uuidSchema,
  username: nameSchema,
  createdAt: isoDateTimeSchema,
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;

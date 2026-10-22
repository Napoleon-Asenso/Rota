import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .refine(
      (val) => !/[^a-zA-Z\s]/.test(val),
      'Name can only contain letters and spaces.'
    )
    .refine((val) => {
      const words = val.trim().split(/\s+/).filter(Boolean);
      return words.length >= 2;
    }, 'Full name must contain at least two words (e.g. First and Last name).'),
  firstName: z.string().trim().optional(),
  middleName: z.string().trim().nullable().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .trim()
    .min(8, 'Password must be at least 8 characters long')
    .refine((val) => /[A-Z]/.test(val), 'Password must contain at least 1 uppercase letter')
    .refine((val) => /[a-z]/.test(val), 'Password must contain at least 1 lowercase letter')
    .refine((val) => /[0-9]/.test(val), 'Password must contain at least 1 number')
    .refine((val) => /[^A-Za-z0-9]/.test(val), 'Password must contain at least 1 special character'),
  inviteToken: z.string().trim().optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().trim().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

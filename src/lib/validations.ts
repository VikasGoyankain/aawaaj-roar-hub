import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const addUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  role: z.enum(['President', 'Regional Head', 'University President', 'Volunteer'], {
    required_error: 'Role is required',
  }),
  region: z.string().optional().nullable(),
});

export const addUserSchemaRefined = addUserSchema.refine(
  (data) => {
    if (data.role === 'Regional Head' || data.role === 'University President') {
      return data.region && data.region.length > 0;
    }
    return true;
  },
  {
    message: 'Region is required for Regional Head and University President roles',
    path: ['region'],
  }
);

export type AddUserFormData = z.infer<typeof addUserSchema>;

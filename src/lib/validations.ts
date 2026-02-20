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

export const ALL_ROLES = [
  'President',
  'Technical Head',
  'Content Head',
  'Regional Head',
  'University President',
  'Volunteer',
] as const;

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name required').max(100),
  mobile_no: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Non-Binary', 'Prefer not to say']).optional(),
  residence_district: z.string().optional(),
  current_region_or_college: z.string().optional(),
  roles: z.array(z.enum(ALL_ROLES)).min(1, 'At least one role is required'),
});
export type AddMemberFormData = z.infer<typeof addMemberSchema>;

export const blogSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers, hyphens only'),
  content: z.string().min(10, 'Content too short'),
  cover_image: z.string().url().optional().or(z.literal('')),
  published: z.boolean(),
});
export type BlogFormData = z.infer<typeof blogSchema>;

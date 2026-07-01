import { z } from 'zod';

export const loginSchema = z.object({
  password: z.string({
    required_error: 'Password is required'
  }).min(1, 'Password cannot be empty')
});

export type LoginInput = z.infer<typeof loginSchema>;

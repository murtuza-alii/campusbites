import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  canteen_id: z.string().optional(),
  canteen_slug: z.string().optional(),
  role: z.string().optional(),
  pin: z.string().optional()
}).refine((data) => {
  const hasUserPass = !!((data.username || data.email) && (data.password || data.pin));
  const hasCanteenRolePin = !!((data.canteen_id || data.canteen_slug) && (data.pin || data.password));
  return hasUserPass || hasCanteenRolePin;
}, {
  message: 'Must provide either username/email & password or canteen outlet & pin'
});

export type LoginInput = z.infer<typeof loginSchema>;

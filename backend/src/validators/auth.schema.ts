import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  canteen_id: z.string().optional(),
  canteen_slug: z.string().optional(),
  role: z.string().optional(),
  pin: z.string().optional()
}).refine((data) => {
  const hasUserPass = !!(data.username && (data.password || data.pin));
  const hasCanteenRolePin = !!((data.canteen_id || data.canteen_slug) && data.role && (data.pin || data.password));
  return hasUserPass || hasCanteenRolePin;
}, {
  message: 'Must provide either username & password or canteen, role & pin'
});

export type LoginInput = z.infer<typeof loginSchema>;

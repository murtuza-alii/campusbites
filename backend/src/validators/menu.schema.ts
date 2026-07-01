import { z } from 'zod';

export const createMenuItemSchema = z.object({
  name: z.string({
    required_error: 'Name is required'
  }).min(1, 'Name cannot be empty'),
  price: z.number({
    required_error: 'Price is required'
  }).min(0, 'Price must be a positive number'),
  category: z.string({
    required_error: 'Category is required'
  }).min(1, 'Category cannot be empty'),
  image: z.string().url('Image must be a valid URL').optional()
});

export const updateMenuItemSchema = z.object({
  name: z.string({
    required_error: 'Name is required'
  }).min(1, 'Name cannot be empty'),
  price: z.number({
    required_error: 'Price is required'
  }).min(0, 'Price must be a positive number'),
  category: z.string({
    required_error: 'Category is required'
  }).min(1, 'Category cannot be empty'),
  is_available: z.boolean({
    required_error: 'is_available flag is required'
  }),
  image: z.string().url('Image must be a valid URL').optional()
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

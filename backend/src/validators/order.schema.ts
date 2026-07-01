import { z } from 'zod';

export const createOrderSchema = z.object({
  name: z.string({
    required_error: 'Student name is required'
  }).min(1, 'Student name cannot be empty'),
  rollNumber: z.string({
    required_error: 'Roll number or phone is required'
  }).min(1, 'Roll number cannot be empty'),
  totalPrice: z.number({
    required_error: 'Total price is required'
  }).min(0, 'Total price must be positive'),
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      price: z.number().min(0),
      quantity: z.number().int().min(1)
    }),
    {
      required_error: 'Order items are required'
    }
  ).min(1, 'Order must contain at least one item')
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED'], {
    errorMap: () => ({ message: 'Status must be PENDING, PREPARING, READY, or COMPLETED' })
  })
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

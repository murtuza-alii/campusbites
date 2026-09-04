import { Queue, Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { emitOrderCreated, emitOrderStatusChanged } from '../utils/websocket.js';
import { generatePickupCode } from '../utils/qrSigner.js';
import { generateSlotOrderNumber } from '../utils/orderNumber.js';

const QUEUE_NAME = 'order-queue';

// 1. Create the Queue
export const orderQueue = new Queue(QUEUE_NAME, {
  connection: redisConnectionOptions,
});

// 2. Initialize the background Worker
let worker: Worker | null = null;

export function initOrderWorker(): Worker {
  if (worker) return worker;

  const orderRepository = new OrderRepository();

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      console.log(`Processing checkout job ${job.id} for order ${job.data.id}...`);

      const { id, student_name, student_roll, canteen_id, items, total_price, additional_charges, additionalCharges, pickupCode, building, break_timing } = job.data;

      try {
        // Calculate slot and alphanumeric order number
        const totalOrders = await orderRepository.countAll();
        const { orderNumber, slotNumber } = generateSlotOrderNumber(totalOrders);

        // Alphanumeric pickup code
        const finalPickupCode = pickupCode || generatePickupCode(4);

        // Write order details to PostgreSQL
        await orderRepository.create({
          id,
          order_number: orderNumber,
          student_name,
          student_roll,
          canteen_id,
          items: typeof items === 'string' ? items : JSON.stringify(items),
          total_price,
          additional_charges: additional_charges || additionalCharges || 0,
          status: 'PENDING',
          pickup_code: finalPickupCode,
          building,
          break_timing,
          slot_number: slotNumber,
        });

        // Retrieve and notify
        const savedOrder = await orderRepository.findById(id);
        if (!savedOrder) {
          throw new Error(`Order ${id} could not be retrieved after database write.`);
        }

        const parsedOrder = {
          ...savedOrder,
          items: JSON.parse(savedOrder.items),
        };

        // Notify staff dashboard (new ticket)
        emitOrderCreated(parsedOrder);

        // Notify student page (transitions to active pending with order details)
        emitOrderStatusChanged(parsedOrder);

        console.log(`Successfully completed order checkout job ${job.id} for order ${orderNumber}`);
      } catch (error) {
        console.error(`Failed to process order job ${job.id}:`, error);
        throw error;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5, // Process up to 5 orders in parallel
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}

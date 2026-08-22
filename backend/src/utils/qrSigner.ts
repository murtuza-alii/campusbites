import crypto from 'crypto';
import { config } from '../config/unifiedConfig.js';

const SECRET = config.auth.jwtSecret || 'campusbites_secret';

export interface QRPayload {
  order_id: string;
  order_number: string;
  canteen_id: string;
  pickup_code: string;
  signature: string;
}

export function generateQRSignature(orderId: string, pickupCode: string): string {
  const data = `${orderId}:${pickupCode}`;
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

export function buildQRPayload(order: { id: string; order_number: string; canteen_id: string; pickup_code: string }): QRPayload {
  const signature = generateQRSignature(order.id, order.pickup_code);
  return {
    order_id: order.id,
    order_number: order.order_number,
    canteen_id: order.canteen_id,
    pickup_code: order.pickup_code,
    signature
  };
}

export function verifyQRSignature(orderId: string, pickupCode: string, signature: string): boolean {
  try {
    const expected = generateQRSignature(orderId, pickupCode);
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    return false;
  }
}

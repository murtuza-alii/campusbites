import crypto from 'crypto';
import { config } from '../config/unifiedConfig.js';

export interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  customerName: string;
  customerRoll: string;
  customerPhone?: string;
  customerEmail?: string;
  returnUrl?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  entity: string;
  order_currency: string;
  order_amount: number;
  order_status: 'PAID' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  payment_session_id: string;
  order_expiry_time?: string;
  payments?: {
    url: string;
  };
  settlements?: {
    url: string;
  };
  refunds?: {
    url: string;
  };
}

export class PaymentService {
  private getHeaders(): Record<string, string> {
    return {
      'x-client-id': config.cashfree.appId,
      'x-client-secret': config.cashfree.secretKey,
      'x-api-version': config.cashfree.apiVersion,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Format phone number to clean 10-digit format acceptable by Cashfree
   */
  private sanitizePhone(rawPhone?: string): string {
    if (!rawPhone) return '9876543210';
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return '9876543210';
  }

  /**
   * Create an order on Cashfree Payment Gateway
   */
  async createCashfreeOrder(params: CreateOrderParams): Promise<CashfreeOrderResponse> {
    const { orderId, orderAmount, customerName, customerRoll, customerEmail, returnUrl } = params;

    const sanitizedPhone = this.sanitizePhone(params.customerPhone || customerRoll);
    const sanitizedCustomerId = `cust_${(customerRoll || orderId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45)}`;
    const sanitizedEmail = customerEmail || `student_${sanitizedCustomerId}@campusbites.internal`;
    const defaultReturnUrl = `${config.server.frontendUrl}/c?order_id={order_id}&payment_status=success`;

    const payload = {
      order_id: orderId,
      order_amount: Number(orderAmount.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: sanitizedCustomerId,
        customer_name: customerName.trim() || 'Student',
        customer_email: sanitizedEmail,
        customer_phone: sanitizedPhone,
      },
      order_meta: {
        return_url: returnUrl || defaultReturnUrl,
        notify_url: undefined,
        payment_methods: 'cc,dc,upi,nb,app',
      },
      order_note: `CampusBites Canteen Order ${orderId}`,
    };

    console.log(`[Cashfree] Initiating order creation for ${orderId}, amount: ₹${orderAmount}`);

    const response = await fetch(`${config.cashfree.baseUrl}/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const responseData: any = await response.json();

    if (!response.ok) {
      console.error('[Cashfree] Order creation failed:', responseData);
      const errorMsg = responseData?.message || responseData?.error || 'Failed to create Cashfree order';
      const error = new Error(errorMsg);
      (error as any).statusCode = response.status;
      (error as any).details = responseData;
      throw error;
    }

    console.log(`[Cashfree] Order ${orderId} created successfully. Session ID: ${responseData.payment_session_id?.substring(0, 15)}...`);
    return responseData as CashfreeOrderResponse;
  }

  /**
   * Query Cashfree for the current status of an order
   */
  async getCashfreeOrderStatus(orderId: string): Promise<CashfreeOrderResponse> {
    console.log(`[Cashfree] Fetching status for order ${orderId}`);

    const response = await fetch(`${config.cashfree.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const responseData: any = await response.json();

    if (!response.ok) {
      console.error(`[Cashfree] Fetch status failed for ${orderId}:`, responseData);
      const error = new Error(responseData?.message || 'Failed to retrieve Cashfree order status');
      (error as any).statusCode = response.status;
      throw error;
    }

    return responseData as CashfreeOrderResponse;
  }

  /**
   * Verify Cashfree Webhook Signature
   */
  verifyWebhookSignature(signature: string, rawBody: string, timestamp: string): boolean {
    if (!signature || !rawBody || !timestamp) return false;
    try {
      const generatedSignature = crypto
        .createHmac('sha256', config.cashfree.secretKey)
        .update(timestamp + rawBody)
        .digest('base64');
      return generatedSignature === signature;
    } catch (e) {
      console.error('[Cashfree] Signature verification failed:', e);
      return false;
    }
  }
}

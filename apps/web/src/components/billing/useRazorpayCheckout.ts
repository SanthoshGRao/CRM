'use client';

import { useCallback, useState } from 'react';
import { billingApi } from '@/lib/api/services';
import { authApi } from '@/lib/api/services';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/api/errors';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout.')));
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}

/** Opens Razorpay Checkout for a plan (defaults to the tenant's current one) and verifies the payment on success. */
export function useRazorpayCheckout() {
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);

  const pay = useCallback(async (planId?: string, seats?: number) => {
    setError(null);
    setIsPaying(true);
    try {
      await loadCheckoutScript();
      const order = await billingApi.createCheckout(planId, seats);

      await new Promise<void>((resolve, reject) => {
        const razorpay = new window.Razorpay!({
          key: order.razorpayKeyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'CRM Platform',
          description: `${order.planName} plan — ${order.seats} seat${order.seats === 1 ? '' : 's'}`,
          handler: async (response: any) => {
            try {
              await billingApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              const fresh = await authApi.me();
              if (accessToken) setSession(accessToken, fresh);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
          theme: { color: '#4f46e5' },
        });
        razorpay.open();
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsPaying(false);
    }
  }, [accessToken, setSession]);

  return { pay, isPaying, error };
}

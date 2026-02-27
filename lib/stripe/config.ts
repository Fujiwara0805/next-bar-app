/**
 * ============================================
 * Stripe フロントエンド設定
 * ============================================
 */
import { loadStripe } from '@stripe/stripe-js';

/**
 * フロントエンド用 Stripe インスタンス（シングルトン）
 */
let stripePromise: ReturnType<typeof loadStripe> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

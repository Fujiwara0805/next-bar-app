/**
 * ============================================
 * Stripe クライアント設定
 * ============================================
 */
import Stripe from 'stripe';

/**
 * サーバーサイド用 Stripe クライアント
 * API Route内でのみ使用する
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

/**
 * Stripe Webhook シグネチャ検証用のシークレット
 */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

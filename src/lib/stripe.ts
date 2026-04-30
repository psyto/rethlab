import Stripe from 'stripe';

let cached: Stripe | null = null;

/**
 * Returns the Stripe server client. Throws if STRIPE_SECRET_KEY is missing,
 * so API routes get a clear 500 instead of a confusing runtime error.
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  cached = new Stripe(key);
  return cached;
}

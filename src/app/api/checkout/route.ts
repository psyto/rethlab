import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

const MIN_USD = 1;
const MAX_USD = 10_000;

function siteOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  // Fall back to the request origin (dev: http://localhost:3000)
  return new URL(req.url).origin;
}

function basePath(): string {
  // basePath is configured in next.config.js as '/rethlab'
  return '/rethlab';
}

export async function POST(req: Request) {
  let amountUsd: number;
  try {
    const body = await req.json();
    amountUsd = Number(body?.amountUsd);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD || amountUsd > MAX_USD) {
    return NextResponse.json(
      { error: `amountUsd must be a number between ${MIN_USD} and ${MAX_USD}` },
      { status: 400 },
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Stripe is not configured on this server' },
      { status: 503 },
    );
  }

  const origin = siteOrigin(req);
  const bp = basePath();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amountUsd * 100),
            product_data: {
              name: 'RethLab — one-time donation',
              description:
                'Supports source-grounded Rust Ethereum developer training.',
            },
          },
        },
      ],
      success_url: `${origin}${bp}/donate/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${bp}/donate/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout creation failed', e);
    return NextResponse.json(
      { error: 'Could not create checkout session' },
      { status: 500 },
    );
  }
}

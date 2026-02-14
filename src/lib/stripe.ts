import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Report voice usage to Stripe Meter Events
 */
export async function reportUsage(
  stripeCustomerId: string,
  minutes: number,
  conversationId: string,
): Promise<string> {
  const event = await stripe.billing.meterEvents.create({
    event_name: "voice_minutes",
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: String(Math.ceil(minutes)),
    },
    identifier: conversationId,
    timestamp: Math.floor(Date.now() / 1000),
  });

  return event.identifier;
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  stripeCustomerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url!;
}

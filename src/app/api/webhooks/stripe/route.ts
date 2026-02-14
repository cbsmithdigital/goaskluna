import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();
  const signature = headerPayload.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db.organization.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscription.id,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db.organization.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: null,
        },
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const org = await db.organization.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (org) {
        await db.invoice.upsert({
          where: { stripeInvoiceId: invoice.id },
          update: {
            amountCents: invoice.amount_paid,
            status: invoice.status || "paid",
          },
          create: {
            orgId: org.id,
            stripeInvoiceId: invoice.id,
            amountCents: invoice.amount_paid,
            status: invoice.status || "paid",
            periodStart: new Date((invoice.period_start || 0) * 1000),
            periodEnd: new Date((invoice.period_end || 0) * 1000),
            baseChargeCents: 0,
            usageChargeCents: 0,
            totalMinutes: 0,
            pdfUrl: invoice.invoice_pdf,
          },
        });

        // Reset monthly usage counter
        await db.organization.update({
          where: { id: org.id },
          data: { usedMinutes: 0, graceNotified: false },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const org = await db.organization.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (org) {
        await db.invoice.upsert({
          where: { stripeInvoiceId: invoice.id },
          update: { status: "payment_failed" },
          create: {
            orgId: org.id,
            stripeInvoiceId: invoice.id,
            amountCents: invoice.amount_due,
            status: "payment_failed",
            periodStart: new Date((invoice.period_start || 0) * 1000),
            periodEnd: new Date((invoice.period_end || 0) * 1000),
            baseChargeCents: 0,
            usageChargeCents: 0,
            totalMinutes: 0,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

import { headers } from "next/headers";
import Stripe from "stripe";

import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Handle Stripe webhook events
 *     description: Processes Stripe webhook events for subscription management and payment processing
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       description: Stripe webhook event payload
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the event
 *               object:
 *                 type: string
 *                 enum: [event]
 *                 description: String representing the object's type
 *               type:
 *                 type: string
 *                 description: Description of the event
 *                 enum:
 *                   - checkout.session.completed
 *                   - invoice.payment_succeeded
 *               data:
 *                 type: object
 *                 description: Object containing data associated with the event
 *             required: [id, object, type, data]
 *     parameters:
 *       - in: header
 *         name: Stripe-Signature
 *         required: true
 *         description: Stripe webhook signature for verification
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid webhook signature or malformed request
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Webhook Error: Invalid signature"
 *       500:
 *         description: Internal server error processing webhook
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Internal server error"
 */
export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return new Response(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Retrieve the subscription details from Stripe.
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    ) as Stripe.Subscription;

    // Update the user stripe into in our database.
    // Since this is the initial subscription, we need to update
    // the subscription id and customer id.
    await prisma.user.update({
      where: {
        id: session?.metadata?.userId,
      },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0]?.price?.id || '',
        stripeCurrentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000,
        ),
      },
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    // If the billing reason is not subscription_create, it means the customer has updated their subscription.
    // If it is subscription_create, we don't need to update the subscription id and it will handle by the checkout.session.completed event.
    if (invoice.billing_reason != "subscription_create") {
      // Retrieve the subscription details from Stripe.
      const subscription = await stripe.subscriptions.retrieve(
        (invoice as any).subscription as string,
      ) as Stripe.Subscription;

      // Update the price id and set the new period end.
      await prisma.user.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          stripePriceId: subscription.items.data[0]?.price?.id || '',
          stripeCurrentPeriodEnd: new Date(
            (subscription as any).current_period_end * 1000,
          ),
        },
      });
    }
  }

  return new Response(null, { status: 200 });
}

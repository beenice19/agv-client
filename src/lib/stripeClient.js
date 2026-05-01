import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const isStripeReady =
  Boolean(stripePublishableKey) &&
  !stripePublishableKey.includes("PASTE_");

export const stripePromise = isStripeReady
  ? loadStripe(stripePublishableKey)
  : null;
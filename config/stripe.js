import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const PLATFORM_FEE_PERCENT = Number(
  process.env.PLATFORM_FEE_PERCENT || 8
);

export default stripe;

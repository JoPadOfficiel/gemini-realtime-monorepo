import { PlansRow, SubscriptionPlan } from "types";
import { env } from "@/env.mjs";

export const pricingData: SubscriptionPlan[] = [
  {
    title: "Free",
    description: "Voice Chat Only",
    benefits: [
      "Voice conversations with Gemini AI",
      "Real-time audio responses",
      "Basic conversation history",
      "Standard voice models",
    ],
    limitations: [
      "No video sharing (camera access)",
      "No screen sharing capabilities",
      "Limited conversation history",
      "Standard support only",
    ],
    prices: {
      monthly: 0,
      yearly: 0,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Pro",
    description: "Voice + Video",
    benefits: [
      "Voice conversations with Gemini AI",
      "Video sharing with camera access",
      "Enhanced conversation history",
      "Priority voice models",
      "Email support",
    ],
    limitations: [
      "No screen sharing capabilities",
      "Limited advanced features",
    ],
    prices: {
      monthly: 15,
      yearly: 144,
    },
    stripeIds: {
      monthly: env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID,
      yearly: env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID,
    },
  },
  {
    title: "Business",
    description: "Complete AI Collaboration",
    benefits: [
      "Voice conversations with Gemini AI",
      "Video sharing with camera access",
      "Screen sharing capabilities",
      "Unlimited conversation history",
      "Premium voice models",
      "Priority support",
    ],
    limitations: [],
    prices: {
      monthly: 25,
      yearly: 240,
    },
    stripeIds: {
      monthly: env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID,
      yearly: env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID,
    },
  },
];

export const plansColumns = [
  "free",
  "pro",
  "business",
] as const;

export const comparePlans: PlansRow[] = [
  {
    feature: "Voice Conversations",
    free: true,
    pro: true,
    business: true,
    tooltip: "All plans include voice conversations with Gemini AI.",
  },
  {
    feature: "Video Sharing (Camera)",
    free: null,
    pro: true,
    business: true,
    tooltip: "Share video from your camera with Gemini AI for enhanced interactions.",
  },
  {
    feature: "Screen Sharing",
    free: null,
    pro: null,
    business: true,
    tooltip: "Share your screen with Gemini AI for collaborative work.",
  },
  {
    feature: "Conversation History",
    free: "Basic",
    pro: "Enhanced",
    business: "Unlimited",
    tooltip: "Access to your previous conversations with Gemini AI.",
  },
  {
    feature: "Voice Models",
    free: "Standard",
    pro: "Priority",
    business: "Premium",
    tooltip: "Access to different quality levels of Gemini voice models.",
  },
  {
    feature: "Support",
    free: "Community",
    pro: "Email",
    business: "Priority",
    tooltip: "Different levels of customer support based on your plan.",
  },
  {
    feature: "Real-time Audio",
    free: true,
    pro: true,
    business: true,
    tooltip: "Real-time audio responses from Gemini AI.",
  },
  {
    feature: "Advanced Features",
    free: null,
    pro: "Limited",
    business: "Full Access",
    tooltip: "Access to advanced AI collaboration features.",
  },
];

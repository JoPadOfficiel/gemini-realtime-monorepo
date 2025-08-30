import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { HeaderSection } from "../shared/header-section";

const pricingFaqData = [
  {
    id: "item-1",
    question: "What is the cost of the free plan?",
    answer:
      "Our free plan is completely free, with no monthly or annual charges. It includes voice conversations with Gemini AI and basic features to get you started.",
  },
  {
    id: "item-2",
    question: "How much does the Pro plan cost?",
    answer:
      "The Pro plan is priced at $15 per month or $144 per year (20% discount). It includes voice conversations plus video sharing with camera access.",
  },
  {
    id: "item-3",
    question: "What is the price of the Business plan?",
    answer:
      "The Business plan is available for $25 per month or $240 per year (20% discount). It offers all features including voice, video, and screen sharing capabilities.",
  },
  {
    id: "item-4",
    question: "Do you offer any annual subscription plans?",
    answer:
      "Yes, we offer annual subscription plans with 20% savings. The Pro Annual plan is $144 per year, and the Business Annual plan is $240 per year.",
  },
  {
    id: "item-5",
    question: "What's the difference between voice, video, and screen sharing?",
    answer:
      "Voice allows audio conversations with Gemini AI. Video sharing lets you share your camera feed for visual interactions. Screen sharing enables you to share your entire screen for collaborative work and assistance.",
  },
];

export function PricingFaq() {
  return (
    <section className="container max-w-4xl py-2">
      <HeaderSection
        label="FAQ"
        title="Frequently Asked Questions"
        subtitle="Explore our comprehensive FAQ to find quick answers to common
          inquiries. If you need further assistance, don't hesitate to
          contact us for personalized help."
      />

      <Accordion type="single" collapsible className="my-12 w-full">
        {pricingFaqData.map((faqItem) => (
          <AccordionItem key={faqItem.id} value={faqItem.id}>
            <AccordionTrigger>{faqItem.question}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground sm:text-[15px]">
              {faqItem.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

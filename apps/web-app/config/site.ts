import { SidebarNavItem, SiteConfig } from "types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL;

export const siteConfig: SiteConfig = {
  name: "ARKELY",
  description:
    "Experience the future of AI interaction with ARKELY - powered by Gemini Live. Real-time audio and video conversations with advanced AI, featuring seamless interruption handling and multimodal capabilities for the ultimate intelligent assistant experience.",
  url: site_url,
  ogImage: `${site_url}/_static/og.jpg`,
  links: {
    twitter: "https://twitter.com/JoPadOfficiel",
    github: "https://github.com/JoPadOfficiel",
  },
  mailSupport: "support@arkely.ai",
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Legal",
    items: [
      { title: "Terms of Service", href: "/terms" },
      { title: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    title: "Product",
    items: [
      { title: "Documentation", href: "/docs" },
      { title: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Support",
    items: [
      { title: "Contact", href: "mailto:support@arkely.ai" },
      { title: "GitHub", href: "https://github.com/JoPadOfficiel" },
    ],
  },
];

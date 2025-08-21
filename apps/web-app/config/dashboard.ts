import { UserRole } from "@prisma/client";

import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "MENU",
    items: [
      {
        href: "/dashboard/admin",
        icon: "laptop",
        title: "Admin Panel",
        authorizeOnly: UserRole.ADMIN,
      },
      { href: "/dashboard", icon: "dashboard", title: "Dashboard" },
      {
        href: "/dashboard/billing",
        icon: "billing",
        title: "Billing",
        authorizeOnly: UserRole.USER,
      },
      { href: "/dashboard/charts", icon: "lineChart", title: "Charts" },
      {
        href: "/dashboard/admin/orders",
        icon: "package",
        title: "Orders",
        badge: 2,
        authorizeOnly: UserRole.ADMIN,
      },
    ],
  },
  {
    title: "GEMINI LIVE",
    items: [
      { href: "/dashboard/gemini-live/audio", icon: "mic", title: "Audio Chat" },
      { href: "/dashboard/gemini-live/video", icon: "video", title: "Video Chat" },
      { href: "/dashboard/gemini-live/screen", icon: "monitor", title: "Screen Share" },
    ],
  },
  {
    title: "OPTIONS",
    items: [
      { href: "/dashboard/settings", icon: "settings", title: "Settings" },
      { href: "/", icon: "home", title: "Homepage" },
      { href: "/api/swagger", icon: "bookOpen", title: "API Documentation" },
    ],
  },
];

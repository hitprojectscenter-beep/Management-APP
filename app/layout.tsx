import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Work OS - המרכז למיפוי ישראל",
    template: "%s · Work OS",
  },
  description: "פלטפורמת ניהול פרויקטים פנים-ארגונית | Internal Project Management Platform",
  applicationName: "Work OS",
  keywords: ["PMO", "Project Management", "Work OS", "מפ״י", "ניהול פרויקטים"],
  authors: [{ name: "המרכז למיפוי ישראל" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Work OS",
    statusBarStyle: "black-translucent",
    startupImage: "/mapi-logo.svg",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/mapi-logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/mapi-logo.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: "/mapi-logo.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Work OS",
    title: "Work OS - המרכז למיפוי ישראל",
    description: "פלטפורמת ניהול פרויקטים פנים-ארגונית",
    images: [{ url: "/mapi-logo.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e5fa8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d3a72" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

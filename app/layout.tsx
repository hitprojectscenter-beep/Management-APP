import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PMO++ - המרכז למיפוי ישראל",
    template: "%s · PMO++",
  },
  description: "פלטפורמת ניהול פרויקטים פנים-ארגונית | Internal Project Management Platform",
  applicationName: "PMO++",
  keywords: ["PMO", "Project Management", "PMO++", "מפ״י", "ניהול פרויקטים"],
  authors: [{ name: "המרכז למיפוי ישראל" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PMO++",
    statusBarStyle: "black-translucent",
    startupImage: "/mapi-logo.png",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/mapi-logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/mapi-logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/mapi-logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "PMO++",
    title: "PMO++ - המרכז למיפוי ישראל",
    description: "פלטפורמת ניהול פרויקטים פנים-ארגונית",
    images: [{ url: "/mapi-logo.png" }],
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

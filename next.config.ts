import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Large Zoom / Google Meet recordings come through the intake page
      // as multipart uploads. The route handler reads them via req.formData()
      // so this Server-Actions limit doesn't strictly apply, but we keep
      // it in step so anything that does flow through Server Actions in
      // the future can also handle big audio files.
      bodySizeLimit: "300mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default withNextIntl(nextConfig);

import type { MetadataRoute } from "next";
import { blockedCrawlerUserAgents } from "@/lib/crawlers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: blockedCrawlerUserAgents,
        disallow: "/",
      },
    ],
  };
}

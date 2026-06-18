export const robotsTagHeaderValue =
  "noindex, nofollow, noarchive, nosnippet, noimageindex";

export const blockedCrawlerUserAgents = [
  "Googlebot",
  "Google-Extended",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "CCBot",
  "Bytespider",
  "Applebot",
  "Amazonbot",
  "FacebookBot",
  "Meta-ExternalAgent",
  "Diffbot",
  "cohere-ai",
  "YouBot",
];

export function isBlockedCrawlerUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return false;
  }

  const normalized = userAgent.toLowerCase();
  return blockedCrawlerUserAgents.some((crawler) =>
    normalized.includes(crawler.toLowerCase()),
  );
}

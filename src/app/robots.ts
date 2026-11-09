// robots.txt (2026-11-09, Kyle): only the search engines that send fans here may crawl the site
// (Google, Bing, Apple search), plus the link-preview fetchers that build the card when someone shares
// a link. Everyone else, OpenAI and the AI-training and data-selling crawlers included, is turned
// away: they cost server time and give nothing back. Crawlers that ignore this are blocked at the
// Vercel firewall (see docs/db_changelog.md, 2026-11-09).
import type { MetadataRoute } from 'next'

const PRIVATE = ['/admin', '/api', '/auth', '/settings', '/profile']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // search engines: the site, but not the admin, account or API pages
      { userAgent: ['Googlebot', 'Bingbot', 'Applebot'], allow: '/', disallow: PRIVATE },
      // link previews when someone shares a page (one page each, no crawling)
      { userAgent: ['facebookexternalhit', 'Twitterbot', 'Slackbot', 'Discordbot', 'LinkedInBot', 'WhatsApp', 'TelegramBot'], allow: '/' },
      // AI training opt-outs for the search companies we do allow (these don't affect search results)
      { userAgent: ['Google-Extended', 'Applebot-Extended'], disallow: '/' },
      // everyone else
      { userAgent: '*', disallow: '/' },
    ],
  }
}

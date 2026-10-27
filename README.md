# Smart KTeam — Site Structure & Deployment Guide

## Pages

| File | URL | Notes |
|---|---|---|
| `index.html` | smartkteam.com/ | Homepage; 5 service cards + portfolio bento grid |
| `website-design.html` | /website-design | Service page |
| `seo.html` | /seo | Service page |
| `booking-payment.html` | /booking-payment | Service page |
| `google-ads.html` | /google-ads | Service page |
| `insurance-claims.html` | /insurance-claims | Service page — promotes ClinicFlow |
| `google-business-profile.html` | /google-business-profile | Unlinked (hidden from nav/grid) |
| `blog.html` | /blog | Blog index |
| `blog-*.html` | /blog-… | 4 blog posts (website-not-getting-calls, small-business-marketing, google-maps-ranking, online-booking-system) |
| `portfolio/<name>/index.html` | /portfolio/<name> | 7 independent demo sites (own CSS, not part of the shared assets) |
| `qa.html` | /qa | Q&A page |
| `vercel.json` | — | Clean URLs (no .html), legacy Wix redirects, `/images` cache header |
| `sitemap.xml` | /sitemap.xml | 13 indexed pages |
| `robots.txt` | /robots.txt | Points crawlers to sitemap |
| `api/contact.js` | /api/contact | Contact form handler (Resend) |

## Shared assets and partials

| Path | What it is |
|---|---|
| `assets/base.css` | CSS common to all 13 main pages |
| `assets/site.css` | CSS common to the 8 large pages (index, blog, qa, service pages) |
| `assets/site.js` | Script shared by the 7 service pages |
| `images/` | All site photos, self-hosted WebP (cached for one year, so rename a file if you replace it) |
| `partials/nav.html`, `partials/footer.html` | Single source for the nav (all pages except the homepage) and the footer (all pages) |
| `scripts/sync-partials.js` | Copies the partials into every page |

Each page keeps only its own CSS inline in `<style>`. Rules that could conflict with a page-specific rule were deliberately left inline so the cascade is unchanged: do not move rules into the shared files without checking the page still renders the same.

**Editing the nav or footer:** edit the file in `partials/`, then run `npm run sync`. `npm run check` fails if any page is out of date. The content between `<!-- partial:… -->` markers in the HTML is overwritten by the script, so never edit it in the page itself. `partials/` and `scripts/` are excluded from deploy by `.vercelignore`.

## Contact form

`/api/contact` sends the message through Resend. Required environment variables in Vercel:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — a sender on the verified `smartkteam.com` domain, e.g. `Smart KTeam <contact@smartkteam.com>` (falls back to the Resend sandbox sender if unset)

The handler validates input, has a hidden honeypot field (`website`) and a best-effort per-IP rate limit (5 per 10 minutes). Add a Vercel Firewall rate-limit rule for a hard cap.

## Service card numbering

GBP card is hidden via CSS (`display:none!important`) but remains in the DOM. Visible cards are numbered 01–05:

| # | Service |
|---|---------|
| 01 | Website Design |
| 02 | SEO |
| 03 | Booking & Payment Systems |
| 04 | Google Ads |
| 05 | Insurance Claims for Massage Therapists *(Special)* |

## Hero CSS pattern (service pages)

Bounded absolute positioning prevents the nav logo from overlapping the hero eyebrow text:

```css
.page-hero { height:60vh; min-height:520px; position:relative; overflow:hidden; }
.page-hero-content { position:absolute; top:110px; bottom:72px; left:64px; right:64px; z-index:2;
                     display:flex; flex-direction:column; justify-content:flex-end; }

@media (max-width:1024px) { .page-hero-content { top:90px; bottom:56px; left:36px; right:36px; } }
@media (max-width:768px)  { .page-hero { min-height:380px; }
                             .page-hero-content { top:70px; bottom:40px; left:20px; right:20px; } }
```

Note: `.section-pad` must be overridden explicitly in the 768px block — class specificity beats the generic `section` element rule.

## Deployment

Hosted on Vercel, auto-deploys on push to `main`.

1. Push changes to GitHub → Vercel deploys automatically
2. Verify at https://smartkteam.com

## SEO checklist

- [x] Multi-page architecture (each page ranks independently)
- [x] Per-page meta titles, descriptions, OG tags
- [x] Schema.org LocalBusiness structured data
- [x] Sitemap submitted to Google Search Console
- [ ] Google Analytics 4
- [x] Legacy Wix URLs redirected (301) in `vercel.json`
- [ ] City-specific landing pages (/seattle-seo, /portland-website-design)
- [ ] Real blog posts for ongoing SEO content

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
| `qa.html` | /qa | Q&A page |
| `vercel.json` | — | Clean URLs (no .html), rewrites |
| `sitemap.xml` | /sitemap.xml | 9 indexed pages |
| `robots.txt` | /robots.txt | Points crawlers to sitemap |

## Service card numbering

GBP card is hidden via CSS (`display:none!important`) but remains in the DOM. Visible cards are numbered 01–05:

| # | Service |
|---|---------|
| 01 | Website Design |
| 02 | SEO |
| 03 | Booking & Payment Systems |
| 04 | Google Ads |
| 05 | Insurance Claims for Massage Therapists *(Special)* |

## Hero CSS pattern (all 5 service pages)

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
- [ ] City-specific landing pages (/seattle-seo, /portland-website-design)
- [ ] Real blog posts for ongoing SEO content

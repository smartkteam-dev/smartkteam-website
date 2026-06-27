# Smart KTeam — Multi-Page Site Deployment Guide

## What changed
The site has been split from a Single Page Application (1 HTML file with JS routing) into **8 standalone HTML pages**, each with its own SEO metadata, canonical URL, and rich Schema.org structured data. This is the correct architecture for SEO — each page can now rank independently on Google.

## Files to push to GitHub

| File | Purpose |
|---|---|
| `index.html` | Homepage (smartkteam.com) |
| `google-business-profile.html` | smartkteam.com/google-business-profile |
| `website-design.html` | smartkteam.com/website-design |
| `seo.html` | smartkteam.com/seo |
| `booking-payment.html` | smartkteam.com/booking-payment |
| `google-ads.html` | smartkteam.com/google-ads |
| `qa.html` | smartkteam.com/qa |
| `blog.html` | smartkteam.com/blog |
| `vercel.json` | Vercel config — enables clean URLs (no .html in URL bar) |
| `sitemap.xml` | Tells Google all 8 pages exist |
| `robots.txt` | Points crawlers to the sitemap |

## Deployment steps

1. **Replace** the existing `index.html` in your GitHub repo with the new `index.html`
2. **Add** all 7 other HTML files to the same repo root
3. **Add** `vercel.json`, `sitemap.xml`, and `robots.txt` to the repo root
4. **Commit and push** — Vercel will auto-deploy

## After deployment

1. Visit each URL to confirm they all load:
   - https://smartkteam.com/
   - https://smartkteam.com/google-business-profile
   - https://smartkteam.com/website-design
   - https://smartkteam.com/seo
   - https://smartkteam.com/booking-payment
   - https://smartkteam.com/google-ads
   - https://smartkteam.com/qa
   - https://smartkteam.com/blog

2. **Submit sitemap to Google Search Console**:
   - Go to https://search.google.com/search-console
   - Add property: smartkteam.com
   - Sitemaps → submit: `https://smartkteam.com/sitemap.xml`

3. **Submit to Bing Webmaster Tools** (optional but recommended):
   - https://www.bing.com/webmasters
   - Same process

## SEO benefits you just unlocked

- 8 indexable pages instead of 1
- Each service page can rank for its own keywords
- Per-page meta titles, descriptions, OG tags
- Canonical URLs prevent duplicate content issues
- Schema.org LocalBusiness + ProfessionalService structured data on every page
- Geo-targeting metadata (geo.region, ICBM) for local search
- Proper sitemap for crawlers

## SEO checklist for next steps

- [ ] Verify Google Search Console
- [ ] Verify Bing Webmaster Tools
- [ ] Add a real `og-image.jpg` (1200x630px) to the repo root for social sharing
- [ ] Set up Google Analytics 4 (optional but recommended)
- [ ] Build city-specific landing pages later (e.g., /seattle-seo, /portland-website-design) for broader West Coast geo expansion
- [ ] Add real blog posts to /blog for ongoing SEO content

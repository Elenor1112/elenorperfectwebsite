---
name: verify
description: How to build, run, and visually verify this Next.js site (Elenor marketing agency) end-to-end.
---

# Verifying changes in this repo

## Launch

- Local Postgres must be running: docker container `elenor-cms-pg` (host port 5433). Check with `docker ps`.
- Env lives in `.env.local` (DATABASE_URL points at the local container).
- `npm run dev` → http://localhost:3000 (ready in ~4s; first page request compiles for ~10-30s, so warm it up before timing anything).

## Driving the site

- No Playwright/puppeteer in npm deps, but **Python Playwright** is installed globally with cached Chromium — write a python script (`from playwright.sync_api import sync_playwright`) in the scratchpad and screenshot/evaluate against localhost:3000.
- Node scripts that import project deps (e.g. `sharp`) must live inside the repo root, not the scratchpad — ESM resolution is relative to the script path.

## Gotchas that bit before

- **First-visit intro overlay** (`IntroAnimation`, `#elenor-intro`) plays on a fresh profile and covers the hero for ~6s. Skip it in tests with `ctx.add_init_script("localStorage.setItem('elenor_intro_seen','1')")`.
- **Hero headline reveal** (`HeroHeadline`) plays once per session, keyed on `sessionStorage['elenor_hero_headline_seen']`; reduced-motion contexts skip it entirely.
- Dev runs React 18 **StrictMode double-invoked effects**: the double-invoke fires at first passive-effect flush, which can land *after* an effect's fast async work already ran — GSAP timelines started by run #1 get killed by cleanup #1. Animation code here must tolerate replay (see HeroHeadline's flag-clearing cleanup). When an animation "silently doesn't play" in dev, suspect this first.
- ESLint is not configured (`next lint` prompts interactively — don't run it). Use `npx tsc --noEmit` for static checks.

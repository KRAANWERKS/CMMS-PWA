# CMMS Technician PWA

Public frontend workspace for the CMMS technician/engineer Progressive Web App.

This repository is derived from the private `KRAANWERKS/CMMS` repository, source branch `Development`, pinned initially to commit `435240278f43369e83a91369d063c8b9ecf36bd3`.

## Scope

Included:
- Technician PWA
- Client-side API package required by the PWA
- Shared frontend types
- Minimal shared UI components required by the PWA

Not included:
- CMMS backend
- Database/migrations
- Admin web application
- Internal integrations
- Infrastructure/deployment secrets
- Production credentials

## Requirements

- Node.js 20+
- pnpm

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev:pwa
```

The development server proxies browser requests from `/api` to `CMMS_API_URL`.

Example for a temporary Cloudflare Quick Tunnel:

```env
CMMS_API_URL=https://example.trycloudflare.com
```

Then start the PWA:

```bash
pnpm dev:pwa
```

Default local URL: `http://localhost:3001/pwa/`.

## API contract

The backend remains the source of truth for work-order rules, PM rules, asset health, permissions, and other business logic. This client should consume the backend API rather than duplicate server-side rules.

Do not commit credentials, cookies, API tokens, production URLs, or private backend configuration to this public repository.

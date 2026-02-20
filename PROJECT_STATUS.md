# Wellness Platform - Project Status & Context

## Project Overview

**Purpose:** SaaS platform for wellness centers (gyms, yoga studios, pilates studios) in Mexico to manage their operations, bookings, clients, and marketing.

**Owner:** Clarissa Lopez
**Repository:** https://github.com/Clarissalpzb/wellness-platform (private)

---

## Technical Stack

- **Framework:** Next.js 14+ (App Router with Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** NextAuth v5 (beta) with Credentials + Google providers, JWT strategy
- **UI:** shadcn/ui components with Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens
- **Validation:** Zod v4 (uses `.issues` not `.errors`)
- **Payments:** Stripe integration (webhook ready)
- **AI:** Anthropic Claude integration (lazy-loaded)
- **Email:** Resend integration (lazy-loaded)

---

## What's Been Built

### Phase 1: Foundation (Complete)
- Project configuration (Next.js 16, TypeScript, Tailwind, ESLint)
- Design system with custom color palette (primary sage green, neutrals, accents)
- Full Prisma schema with 20+ models (multi-tenant via `organizationId`)
- NextAuth configuration with JWT + Credentials provider
- Shared UI components (Button, Card, Badge, Dialog, Table, etc.)

### Phase 2-3: Core Pages (Complete)
- **Landing page** (`/`) - Marketing homepage
- **Auth pages** (`/login`, `/registro`, `/recuperar`)
- **Admin module** (7 pages):
  - `/clases` - Class management (CRUD)
  - `/paquetes` - Package/membership management (CRUD)
  - `/equipo` - Staff management (CRUD)
  - `/espacios` - Locations & rooms management (CRUD)
  - `/usuarios` - Client management (read + status)
  - `/crm` - Campaign management (CRUD)
  - `/pos` - Point of sale interface

### Phase 4-6: Client & Dashboard (Complete)
- **Client booking flow** (4 pages):
  - `/app/reservar` - Book classes with date selector
  - `/app/mis-reservas` - View/cancel bookings
  - `/app/perfil` - User profile with stats
  - `/app/amigos` - Social features (friends, referrals)
- **Dashboard** (3 pages):
  - `/dashboard` - Main metrics overview
  - `/dashboard/insights` - AI-powered insights
  - `/dashboard/marketing` - Marketing analytics
  - `/dashboard/operaciones` - Operations view
- **Coach portal**:
  - `/coach` - Coach dashboard
  - `/coach/compensacion` - Compensation tracking

### API Routes (20 endpoints)
```
/api/auth/[...nextauth]  - Auth handlers
/api/classes             - GET (list), POST (create)
/api/classes/[id]        - GET, PUT, DELETE
/api/packages            - GET, POST
/api/packages/[id]       - GET, PUT, DELETE
/api/staff               - GET, POST
/api/staff/[id]          - GET, PUT, DELETE
/api/locations           - GET, POST
/api/locations/[id]      - GET, PUT, DELETE
/api/spaces              - POST
/api/spaces/[id]         - PUT, DELETE
/api/campaigns           - GET, POST
/api/campaigns/[id]      - GET, PUT, DELETE
/api/products            - GET, POST
/api/products/[id]       - GET, PUT, DELETE
/api/users               - GET (list clients)
/api/users/[id]          - GET, PUT
/api/schedule            - GET (by date/dayOfWeek)
/api/bookings            - GET (user's bookings), POST (create)
/api/bookings/[id]       - GET, PUT, DELETE (cancel with waitlist promotion)
/api/profile             - GET (with stats), PUT (update)
/api/webhooks/stripe     - Stripe webhook handler
```

---

## Key Architecture Decisions

### Route Groups (Important!)
The `(admin)`, `(client)`, `(auth)`, etc. folders are **route groups** that do NOT create URL segments:
- `src/app/(admin)/clases/page.tsx` → URL is `/clases` (NOT `/admin/clases`)
- `src/app/(client)/app/reservar/page.tsx` → URL is `/app/reservar`

### Multi-Tenancy
All data is scoped by `organizationId`. Every API route:
1. Checks auth via `auth()` from NextAuth
2. Extracts `organizationId` from session
3. Filters all queries by org

### Mock Data Fallback Pattern
All pages work without a database by falling back to hardcoded mock data:
```typescript
const fetchData = async () => {
  try {
    const res = await fetch("/api/endpoint");
    if (res.ok) {
      const json = await res.json();
      setData(json.length > 0 ? json : mockData);
    } else {
      setData(mockData);
    }
  } catch {
    setData(mockData);
  }
};
```

### API Helper Pattern
All API routes use shared helpers from `src/lib/api-helpers.ts`:
- `getSessionOrThrow()` - Get session or null
- `getOrgId(session)` - Extract org ID
- `unauthorized()` - 401 response
- `badRequest(message)` - 400 response
- `notFound(message)` - 404 response
- `success(data, status)` - JSON response

---

## File Structure

```
wellness-platform/
├── prisma/
│   └── schema.prisma          # Full database schema
├── src/
│   ├── app/
│   │   ├── (admin)/           # Admin pages (route group)
│   │   │   ├── clases/
│   │   │   ├── paquetes/
│   │   │   ├── equipo/
│   │   │   ├── espacios/
│   │   │   ├── usuarios/
│   │   │   ├── crm/
│   │   │   └── pos/
│   │   ├── (auth)/            # Auth pages
│   │   │   ├── login/
│   │   │   ├── registro/
│   │   │   └── recuperar/
│   │   ├── (client)/          # Client-facing pages
│   │   │   └── app/
│   │   │       ├── reservar/
│   │   │       ├── mis-reservas/
│   │   │       ├── perfil/
│   │   │       └── amigos/
│   │   ├── (coach)/           # Coach portal
│   │   ├── (dashboard)/       # Dashboard pages
│   │   ├── (landing)/         # Landing page
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ai/                # AI insight components
│   │   ├── layouts/           # Sidebar, MobileNav, etc.
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       ├── api-helpers.ts     # API response helpers
│       ├── auth.ts            # NextAuth config
│       ├── db.ts              # Prisma client
│       ├── stripe.ts          # Stripe client (lazy)
│       ├── anthropic.ts       # Claude client (lazy)
│       ├── resend.ts          # Email client (lazy)
│       ├── utils.ts           # cn() utility
│       └── validations.ts     # Zod schemas
├── .env                       # Environment variables
├── docker-compose.yml         # PostgreSQL for local dev
└── package.json
```

---

## How to Run

### Without Database (Mock Data Mode)
```bash
git clone https://github.com/Clarissalpzb/wellness-platform.git
cd wellness-platform
npm install
npm run dev
# Visit http://localhost:3000
```
All pages will display mock data.

### With Database
```bash
# Start PostgreSQL
docker compose up -d

# Run migrations
npx prisma migrate dev

# Seed data (optional)
npx prisma db seed

# Start dev server
npm run dev
```

### Test Credentials (from seed)
- **Admin:** admin@wellness.com / password123
- **Coach:** coach@wellness.com / password123
- **Client:** cliente@wellness.com / password123

---

## Issues Encountered & Fixes

### 1. Zod v4 `.errors` vs `.issues`
**Problem:** Generated code used `parsed.error.errors[0].message`
**Fix:** Zod v4 uses `parsed.error.issues[0].message`

### 2. Route Group URL Confusion
**Problem:** Sidebar links used `/admin/clases` but actual URL is `/clases`
**Fix:** Updated `sidebar.tsx`, `mobile-nav.tsx`, and `auth.ts` middleware

### 3. NextAuth User ID Type
**Problem:** `session.user.id` typed as `string | undefined`
**Fix:** Changed guards to `if (!session?.user?.id)` to narrow type

### 4. Docker Not Available
**Problem:** User doesn't have Docker installed
**Solution:** Mock data fallback pattern allows full UI testing without DB

---

## What's Left To Do

### Not Yet Implemented
1. **Real Stripe Checkout** - Payment processing (webhook exists, needs client flow)
2. **Twilio/WhatsApp** - Message sending for campaigns
3. **Inngest** - Background job processing
4. **Email Templates** - Transactional emails via Resend
5. **Friends/Activity API** - Social features (`/api/friends`, `/api/activity`)
6. **E2E Tests** - Playwright testing
7. **Deployment** - Render/Vercel setup

### Nice to Have
- Image uploads (avatars, class photos)
- Real-time updates (WebSockets for class availability)
- Push notifications
- Advanced analytics/reporting
- Coach schedule management UI
- Waitlist notifications

---

## Session Summary (Feb 20, 2026)

### What We Built Today
1. **Admin CRUD Backend** - 16 API routes for all admin resources
2. **Fixed Navigation** - Route group paths corrected
3. **Added Mock Data** - All admin pages work without DB
4. **Client API Routes** - schedule, bookings, profile endpoints
5. **Wired Client Pages** - All 4 client pages fetch from APIs

### Commits Made
1. `d36e3da` - Full platform with admin CRUD (100+ files)
2. `c98a186` - Fix navigation links
3. `023ccd9` - Add mock data fallbacks to admin
4. `ba8a72c` - Wire client pages with APIs

### Build Status
- **46 routes** total (pages + API)
- **Build passes** with no errors
- **All pushed** to GitHub

---

## Contact & Resources

- **GitHub Repo:** https://github.com/Clarissalpzb/wellness-platform
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **shadcn/ui:** https://ui.shadcn.com
- **NextAuth v5:** https://authjs.dev

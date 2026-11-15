# Hisab Web App — Build Plan

## Architecture Overview

Next.js 14 App Router + TypeScript (strict) + Tailwind CSS + Firebase (Auth + Firestore)

## File Structure

```
/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icons/               # PWA icons 192/512 + maskable
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout: Inter font, metadata, providers
│   │   ├── page.tsx          # Redirect to /login or /main
│   │   ├── login/
│   │   │   └── page.tsx      # Welcome + method selector
│   │   ├── otp/
│   │   │   └── page.tsx      # OTP verification
│   │   ├── setup/
│   │   │   └── page.tsx      # Shop setup
│   │   ├── main/
│   │   │   ├── layout.tsx    # Shell: sidebar (desktop) + bottom nav (mobile) + quick-add
│   │   │   ├── page.tsx      # Home dashboard
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx          # Customer list
│   │   │   │   └── [customerId]/
│   │   │   │       └── page.tsx      # Customer detail + ledger
│   │   │   ├── add-customer/
│   │   │   │   └── page.tsx          # Add/edit customer
│   │   │   ├── add-sale/
│   │   │   │   └── page.tsx
│   │   │   ├── add-payment/
│   │   │   │   └── page.tsx
│   │   │   ├── items/
│   │   │   │   └── page.tsx          # Items list
│   │   │   ├── add-fruit/
│   │   │   │   └── page.tsx          # Add/edit fruit
│   │   │   ├── bills/
│   │   │   │   ├── page.tsx          # Bills dashboard
│   │   │   │   └── [customerId]/
│   │   │   │       └── [billType]/
│   │   │   │           └── page.tsx  # Bill preview
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/               # Shared UI primitives (Button, Input, Card, etc.)
│   │   ├── layout/           # Shell, Sidebar, BottomNav, QuickAdd
│   │   └── features/         # Feature-specific components
│   ├── lib/
│   │   ├── domain/           # Pure business logic (no Firebase imports)
│   │   │   ├── money.ts      # Paise arithmetic, formatting, Indian grouping
│   │   │   ├── bill.ts       # Bill period calc, opening balance, summaries
│   │   │   ├── phone.ts      # Phone normalization, WhatsApp URL
│   │   │   ├── date.ts       # dateKey, period boundaries, timezone
│   │   │   └── formatters.ts # INR display, compact, dates
│   │   ├── firebase/
│   │   │   ├── config.ts     # Firebase app init + demo mode detection
│   │   │   ├── auth.ts       # Auth helpers (phone, email, Google, sign out)
│   │   │   └── firestore.ts  # Collection refs, typed converters
│   │   ├── hooks/            # React hooks for auth, data, offline status
│   │   ├── schemas/          # Zod schemas for all entities
│   │   └── types/            # TypeScript interfaces
│   └── __tests__/
│       └── domain/           # Vitest unit tests for domain layer
├── firestore.rules
├── firestore.indexes.json
├── .env.example
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── next.config.ts
├── package.json
├── PLAN.md
└── README.md
```

## Domain Layer (Pure Functions — No Side Effects)

All money calculations in **integer paise** (1 rupee = 100 paise).
- `toPaise(rupees: number): number` — multiply by 100, round
- `toRupees(paise: number): number` — divide by 100
- `formatINR(paise: number): string` — Indian grouping "₹1,23,456"
- `formatCompact(paise: number): string` — "₹48.5K", "₹1.2L", "₹2.5Cr"
- `calcItemAmount(crates, weightPerCrate, ratePerKg): number` — in paise
- `calcTotalAmount(itemAmount, deliveryCharge): number` — in paise
- `calcCustomerBalance(sales, payments): number` — positive = owes, negative = credit
- `calcBillSummary(sales, payments, periodStart, periodEnd)` — full bill calculation
- `getDateKey(date, timezone): string` — YYYY-MM-DD in timezone
- `getPeriodBounds(type, weeklyStartDay, timezone, referenceDate)` — start/end dateKeys
- `normalizePhone(input): string` — strips to digits, adds 91 prefix
- `whatsappUrl(phone, text): string`

## Data Layer

- Firestore collections: top-level (iOS compatible) with `ownerId` field
- Real-time listeners scoped by `ownerId == currentUser.uid`
- Offline persistence via `persistentLocalCache` + multi-tab
- Custom hooks: `useCustomers`, `useFruits`, `useSales`, `usePayments`, etc.
- Demo mode: when Firebase env vars missing, use in-memory store + localStorage

## Build Phases

1. **Foundation** — project scaffolding, theme, Firebase config, domain layer + tests, formatters, shared UI
2. **Auth + Setup** — login flows, OTP, email, Google, shop setup, guards, shell, nav
3. **Master Data** — customers CRUD, items CRUD
4. **Transactions** — sales, payments, ledger, edit/void
5. **Home + Bills** — dashboard, billing, preview, copy/WhatsApp/PDF, bill history
6. **Reports + Settings** — report tabs, CSV export, settings
7. **Hardening** — PWA, rules, indexes, a11y, responsive, README, checklist

# Hisab — Fruit & Produce Wholesaler Billing & Ledger Web App

**Hisab** is a responsive, installable Progressive Web App (PWA) tailored for fruit and produce wholesalers and retailers. It manages customer ledgers, crate-based sales entries, payments, real-time running balances, period-based statements, and instant sharing via WhatsApp, PDF, and CSV.

Built with **Next.js (App Router)**, **TypeScript (strict)**, **Tailwind CSS v4**, and modular **Firebase v10+ (Auth + Firestore)**.

---

## 📋 Table of Contents
1. [Assumptions](#-assumptions)
2. [Completed Routes & Features](#-completed-routes--features)
3. [Manual Firebase Setup Instructions](#-manual-firebase-setup-instructions)
4. [Local Development & Environment Configuration](#-local-development--environment-configuration)
5. [Domain Layer & Financial Architecture](#-domain-layer--financial-architecture)
6. [Known Limitations](#-known-limitations)
7. [Testing & Verification](#-testing--verification)

---

## 📌 Assumptions

As instructed in Section 0 of the build specification, the following reasonable assumptions were made during development:

1. **Currency & Precision**: Financial calculations use **integer paise** (`1 Rupee = 100 Paise`) to avoid rounding drift. All Firestore money fields are stored in rupees and marked with `moneyUnit: "INR"`; payment documents also have `amountUnit: "INR"`. App reads convert them back to paise for calculations. Older unmarked documents are transactionally migrated the first time they are read.
2. **Timezone**: All business dates default to **Asia/Kolkata (IST, UTC+5:30)**. Every transaction stores both a UTC Firestore Timestamp and an explicit string `dateKey` (`YYYY-MM-DD` in IST). All period boundary calculations (Today, Weekly, Monthly) operate strictly on `dateKey` comparisons to prevent timezone shifting.
3. **Weekly Billing Start Day**: Defaults to Sunday (day index 1), with full configurable support for any day from Sunday through Saturday in Shop Settings.
4. **Demo Mode Fallback**: If Firebase configuration environment variables are omitted or incomplete, the application runs in **Demo Mode** using localStorage (with in-memory fallback). An amber banner (`Demo data — not saved to cloud`) is displayed. Demo mode begins signed out and empty. The mock OTP verification accepts `123456`.
5. **Biometric Security on Web**: Hardware biometrics (Face ID / Touch ID) are native mobile APIs. As specified in Section 16, this is honestly documented in the Security Settings as "Platform biometrics unavailable on web browsers; secure your device lock screen."
6. **Multi-Tenancy & Data Isolation**: Every customer, item, sale, payment, and bill history record carries an `ownerId` matched against the authenticated user's Firebase UID (`request.auth.uid`). Client queries and `firestore.rules` scope access by owner; emulator verification is still required before production deployment.
7. **Delivery vs. Communication**: Opening WhatsApp (`wa.me`) or initiating a PDF share is considered a sharing intention and records to `billHistory`, with feedback that sharing was opened or prepared, never "Delivered".

### Existing Firestore layout and iOS compatibility

New web data is stored under `users/{uid}` in the `customers`, `fruits`, `sales`, `payments`, `billHistory`, and `settings` subcollections. Each record includes `ownerId`, which must match the authenticated Firebase UID. The app also reads pre-existing top-level owner-scoped records for compatibility; those records are not bulk-migrated. Settings use `users/{uid}/settings/app`, with fallback reads from legacy `appSettings/{uid}`. Confirm any iOS client uses the same nested paths before expecting cross-platform synchronization.

---

## 🗺️ Completed Routes & Features

| Route | Description & Features |
|---|---|
| `/` | Root router redirecting authenticated users with a setup profile to `/main`, new accounts to `/setup`, and unauthenticated users to `/login`. |
| `/login` | Multi-method authentication: Indian Phone (+91 with reCAPTCHA OTP), Email/Password (with visibility toggle and forgot password reset), and Google Sign-in. |
| `/otp` | 6-digit auto-advancing OTP verification with backspace support, clipboard paste, 60s countdown resend timer, and development hint (`123456`). |
| `/setup` | First-run onboarding to capture owner name, shop name, phone number, address, and WhatsApp sync toggle. |
| `/main` | **Home Dashboard**: Today's Sales, Today's Collections, Total Pending, Total Customers count, Top 5 pending balance customers, and zero-state setup guides. |
| `/main/customers` | Searchable customer directory with Active / Inactive filter tabs, contact details, and color-coded pending balance badges. |
| `/main/customers/[customerId]` | Customer profile, contact links, lifetime financial summary (Total Sales, Total Received, Net Pending / Overpaid Credit), and 3 interactive tabs: **Ledger** (running balance & CSV export), **Payments**, and **Bills** (with past Bill History). |
| `/main/add-customer` | Unified Add / Edit customer form with duplicate phone number detection, credit limit rules, and Deactivate / Reactivate actions. |
| `/main/items` | Produce catalogue with live count, search, default crate weight, rate/kg, and delivery fee summaries. |
| `/main/add-fruit` | Add / Edit fruit form with crate defaults. In edit mode, shows lifetime sales, crate count, and revenue stats. Protects produce with existing sales from accidental deletion. |
| `/main/add-sale` | Produce sale entry with customer & fruit pickers, automatic default price/weight fill, live amount breakdown (`crates × wt × rate + delivery`), credit limit warnings, and "Save & Add Another". |
| `/main/add-payment` | Record payments (Cash, UPI, Bank) with client-side balance updates, WhatsApp receipt link generation, and copyable fallback modal. |
| `/main/bills` | **Send Bills Dashboard**: Overview of pending debt, quick inline cash collection with receipt toggle, period filter chips, and **Reviewed Bulk Send Queue** modal. |
| `/main/bills/[customerId]/[billType]` | Printable statement preview for **Today**, **Weekly**, or **Monthly** statements. Includes print stylesheet, Copy text button, WhatsApp share link, and real PDF generation using `jsPDF` + `jspdf-autotable`. |
| `/main/reports` | Analytics dashboard across 5 tabs (**Sales, Collections, Customers, Fruits, Payments**) with preset date filters, Recharts visualizations, and instant CSV export per tab. |
| `/main/settings` | Shop profile editor, Weekly Bill start day picker, security disclosure, complete JSON backup export, and Sign Out action. |
| `/_not-found` | Dedicated 404 Not Found screen with route recovery. |
| `/error` | Global App Router error boundary with retry capability. |

---

## 🔧 Manual Firebase Setup Instructions

To connect your own Google Cloud / Firebase project, follow these setup steps in the [Firebase Console](https://console.firebase.google.com):

### 1. Enable Authentication Providers
1. Go to **Firebase Console → Build → Authentication → Sign-in method**.
2. **Phone**: Enable Phone authentication.
   - Under **Phone numbers for testing**, add a test phone number (e.g., `+91 98765 43210`) with verification code `123456`. This allows free testing without consuming SMS quotas.
   - To send SMS to real numbers, link a Cloud Billing account to the Firebase project. Firebase Phone Auth SMS is billed per message; set an SMS region policy that allows India if that is where users sign in.
3. **Email/Password**: Enable Email/Password.
4. **Google**: Enable Google sign-in and configure your support email.

### 2. Configure Authorized Domains
1. Go to **Authentication → Settings → Authorized domains**.
2. Ensure the following domains are listed:
   - `localhost` (for local development)
   - Your production domain (e.g., `your-app.vercel.app` or custom domain).

### 3. Deploy Firestore Security Rules
The repository `firebase.json` points the Firebase CLI to the checked-in rules and indexes. Select the same Firebase project as `.env.local`, then deploy `firestore.rules` using the Firebase CLI or copy its contents into **Firestore Database → Rules**:
```bash
firebase use --add
firebase deploy --only firestore:rules
```
*The provided rules enforce owner-based tenant isolation (`resource.data.ownerId == request.auth.uid`), require `amount > 0` for payments and `crates > 0` for sales, and deny hard-deletion of transaction records.*

### 4. Deploy Firestore Indexes
Deploy `firestore.indexes.json` using the Firebase CLI or configure them in **Firestore Database → Indexes**:
```bash
firebase deploy --only firestore:indexes
```
*Includes composite indexes for `ownerId + customerId + dateKey`, `ownerId + dateKey`, and `ownerId + isVoided`.*

---

## 💻 Local Development & Environment Configuration

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rishujaiswal/Hisab_WEB_APP.git
   cd Hisab_WEB_APP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Firebase Web App credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```
   *(If omitted, the app will run in Demo Mode for testing).*

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💰 Domain Layer & Financial Architecture

All financial calculations reside in pure, framework-agnostic TypeScript functions in `src/lib/domain/`:

- **Integer Arithmetic (`money.ts`)**: Prevents decimal rounding bugs by calculating all figures in paise (`₹100.50` = `10050` paise); Firestore values are converted to rupees at the storage boundary.
- **Indian Number Grouping**: Formats ₹1,23,456 accurately according to Indian Lakh/Crore grouping standards.
- **Derived Accounting (`bill.ts`)**:
  - `Customer Pending = Total Non-Voided Sales (including Delivery) − Total Non-Voided Payments`.
  - Negative balance is rendered as **Customer Credit**, never as positive debt.
  - Zero balance is marked as **All Clear!**.
  - Pending debt above ₹5,000 is highlighted with an alert badge (`#E84040`).
- **Ledger Balance Engine**: Computes running balances chronologically and sorts them newest-first for intuitive reconciliation.
- **Period Math (`date.ts`)**: Accurately computes opening pending balance from all transactions before the period start, adds current period purchases and delivery, subtracts period collections, and derives the net pending balance.

---

## ⚠️ Known Limitations

1. **Browser Bulk WhatsApp Messaging**: Web browsers strictly enforce user-activation policies on `window.open` and `wa.me` URI protocols. Unsolicited background bulk messaging to 50+ contacts without human clicks is blocked by popup blockers and WhatsApp anti-spam policies. Hisab solves this transparently with an interactive **Reviewed Bulk Send Queue** where owners review each customer card and launch WhatsApp individually.
2. **SMS Delivery Confirmation**: The Web Share API and WhatsApp protocol cannot return message delivery receipts to third-party web apps. Once the chat window opens, Hisab records that the statement was launched and prompts the user accordingly.
3. **Hardware Biometric Lock**: WebAuthn does not support native mobile OS Face ID background locks without WebAuthn server credentials. An inactivity screen lock is recommended for high-security environments.

---

## 🧪 Testing & Verification

Run the test suite to verify the Section 20 worked examples and financial domain calculations:

```bash
# Run unit tests
npm run test

# Type-check TypeScript
npx tsc --noEmit

# Run ESLint linter
npm run lint

# Production build
npm run build
```
*(All 38 tests pass across the domain and integration-flow test files, including Section 20 examples and period boundaries.)*

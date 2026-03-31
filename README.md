# Way to Future UA

A modern, multilingual donation platform with integrated payment processing and real-time project tracking.

## ✨ Key Features

- 🌍 **Multilingual Support**: English, Chinese, Ukrainian
- 💳 **Secure Payments**: Stripe integration with multiple payment methods
- 📊 **Project Tracking**: Real-time donation progress and funding goals
- 🔄 **Refund Management**: Complete refund workflow built-in
- 🎯 **Project-Based Donations**: Each project independently managed with unique IDs
- 🔒 **Secure Architecture**: Row Level Security (RLS) with Supabase

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe Payment Intents with webhooks
- **i18n**: next-intl for server-side translations
- **Deployment**: Vercel

## 📖 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete technical documentation
- **[docs/SUPABASE_CLI_GUIDE.md](./docs/SUPABASE_CLI_GUIDE.md)** - Database migrations guide
- **[docs/PAYMENT_METHODS.md](./docs/PAYMENT_METHODS.md)** - Payment configuration
- **[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues

## 🏃 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev

# Apply database migrations
supabase db push
```

Open [http://localhost:3000](http://localhost:3000)

## 🗂️ Project Structure

```
├── app/[locale]/        # Internationalized pages
├── components/          # React components
├── lib/                 # Utilities & API clients
│   ├── supabase/       # Database queries & clients
│   └── stripe/         # Payment processing
├── supabase/
│   └── migrations/     # Database schema (3 files)
├── messages/           # Translation files (en/zh/ua)
├── types/              # TypeScript definitions
└── docs/               # Documentation
```

## 🔧 Environment Variables

Required variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## 📝 Database Schema

The database uses 3 migration files:
1. `001_init_schema.sql` - Tables and constraints
2. `002_init_functions_views.sql` - Functions and views
3. `003_init_policies.sql` - RLS policies and triggers

Donation Status Flow:
```
paid → confirmed → delivering → completed
        ↓
   refunding → refunded
```

## 🚢 Deployment

Deploy to Vercel with one click:

```bash
vercel
```

Make sure to configure all environment variables in Vercel dashboard.

## 📄 License

MIT

---

**Version**: 0.3.0 | **Last Updated**: 2025-12-18

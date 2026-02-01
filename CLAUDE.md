# transaction-tracker

AI-powered transaction categorization from Scapia Federal Credit Card emails.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS 4, Recharts
- **Database**: MySQL 8.0 with mysql2
- **LLM**: Ollama (local)
- **Scheduler**: node-cron
- **Language**: TypeScript 5

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── gmail/route.ts    # Gmail OAuth URL
│   │   │   └── callback/route.ts # OAuth callback
│   │   ├── categories/route.ts   # Category CRUD
│   │   ├── cron/route.ts         # Cron job endpoint
│   │   ├── emails/route.ts       # Email sync
│   │   ├── settings/route.ts     # App settings
│   │   ├── stats/route.ts        # Dashboard stats
│   │   └── transactions/
│   │       ├── route.ts          # Transaction list/create
│   │       └── [id]/route.ts     # Transaction update/delete
│   ├── categories/page.tsx       # Categories page
│   ├── settings/page.tsx         # Settings page
│   ├── transactions/page.tsx     # Transactions page
│   ├── page.tsx                  # Dashboard
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── AlertBanner.tsx           # Budget alerts
│   ├── CategoryPieChart.tsx      # Spending pie chart
│   ├── MonthlyTrendChart.tsx     # Trend line chart
│   ├── Sidebar.tsx               # Navigation
│   ├── StatsCards.tsx            # Summary cards
│   └── TransactionList.tsx       # Transaction table
├── hooks/
│   └── useFetch.ts               # Data fetching hook
├── lib/
│   ├── db.ts                     # MySQL connection pool
│   ├── gmail.ts                  # Gmail API integration
│   └── ollama.ts                 # Ollama categorization
├── types/
│   └── index.ts                  # TypeScript types
scripts/
└── scheduler.ts                  # Standalone cron scheduler
```

## Database Schema

**Tables**:
- `transactions` - Transaction data (merchant, amount, date, category, confidence)
- `categories` - Spending categories with limits and colors
- `category_corrections` - User corrections for learning
- `processing_log` - Sync job history
- `settings` - App configuration

## Key Files

### Email Parser (`src/lib/gmail.ts`)
Parses Scapia email format:
- Date: `DD-MM-YYYY at HH:MM AM/PM`
- Amount: `₹XX.XX`
- Merchant: Text after "Merchant"
- Card: `ending in XXXX`

### AI Categorization (`src/lib/ollama.ts`)
- Keyword-based quick matching
- LLM fallback for ambiguous merchants
- Few-shot learning with examples
- Learns from user corrections

### Categories
1. Food & Dining (red)
2. Transportation (amber)
3. Shopping (purple)
4. Entertainment (pink)
5. Bills & Utilities (blue)
6. Healthcare (green)
7. Travel (cyan)
8. Others (gray)

## Development
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Environment Variables
```env
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, GMAIL_REFRESH_TOKEN
OLLAMA_HOST, OLLAMA_MODEL
CRON_INTERVAL, CRON_SECRET
```

## API Summary

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| /api/transactions | GET, POST | List/create transactions |
| /api/transactions/:id | GET, PATCH, DELETE | Single transaction ops |
| /api/categories | GET, POST, PATCH | Category management |
| /api/stats | GET | Dashboard statistics |
| /api/settings | GET, PATCH | App configuration |
| /api/emails | GET, POST | Gmail sync |
| /api/cron | GET, POST | Cron status/trigger |
| /api/auth/gmail | GET | OAuth URL |
| /api/auth/callback | GET | OAuth callback |

## Ollama Prompt Strategy
- System prompt defines categories and rules
- Few-shot examples for common cases
- Temperature: 0.1 for consistency
- JSON output format enforced
- Fallback to "Others" on error

## Learning System
1. User corrects transaction category
2. Correction stored in `category_corrections`
3. Future categorizations check corrections first
4. Matching merchants get learned category

## Prerequisites
- Ollama running on port 11434
- MySQL running on port 3306
- Gmail OAuth credentials configured

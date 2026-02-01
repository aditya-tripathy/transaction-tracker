# Transaction Tracker

AI-powered transaction categorization system that learns from your Scapia Federal Credit Card email notifications.

## Features

- **Email Integration**: Automatically fetches transaction emails from Gmail
- **AI Categorization**: Uses Ollama (local LLM) to categorize transactions
- **Learning System**: Learns from manual corrections to improve accuracy
- **Dashboard**: Visual spending breakdown with charts
- **Budget Alerts**: Notifications when category limits are exceeded
- **Cron Scheduler**: Configurable automatic sync interval

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes
- **Database**: MySQL 8.0
- **AI**: Ollama (local LLM)
- **Scheduling**: node-cron

## Prerequisites

1. **Node.js** 18+
2. **MySQL** 8.0+
3. **Ollama** with a model installed (e.g., `qwen2.5-coder:7b`)

## Setup

### 1. Install Dependencies

```bash
cd transaction-tracker
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and update values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=transaction_tracker

# Gmail OAuth2 (from Google Cloud Console)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/callback
GMAIL_REFRESH_TOKEN=your_refresh_token

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

### 3. Setup Database

```bash
mysql -u root -p < schema.sql
```

### 4. Setup Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:3000/api/auth/callback` as redirect URI
6. Copy Client ID and Client Secret to `.env.local`
7. Start the app and go to Settings > Connect Gmail
8. After authorization, copy the refresh token from console logs to `.env.local`

### 5. Start Ollama

```bash
ollama serve
# In another terminal:
ollama pull qwen2.5-coder:7b
```

### 6. Run the Application

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

Visit `http://localhost:3000`

### 7. (Optional) Run Scheduler Separately

For continuous background sync:

```bash
npx ts-node scripts/scheduler.ts
```

## Usage

### Dashboard
- View spending overview
- Category breakdown (pie chart)
- Monthly trends (line graph)
- Recent transactions
- Budget alerts

### Transactions
- View all transactions with filters
- Change transaction categories (click on category badge)
- Search by merchant name

### Categories
- Set spending limits for budget alerts
- Customize category colors

### Settings
- Configure sync interval
- Connect/manage Gmail
- Change Ollama model
- View sync status

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions with filters |
| POST | `/api/transactions` | Create transaction |
| PATCH | `/api/transactions/:id` | Update transaction category |
| GET | `/api/categories` | List categories |
| PATCH | `/api/categories` | Update category |
| GET | `/api/stats` | Get dashboard statistics |
| GET | `/api/settings` | Get app settings |
| PATCH | `/api/settings` | Update settings |
| POST | `/api/emails` | Sync emails manually |
| POST | `/api/cron` | Trigger cron job |
| GET | `/api/cron` | Get cron status |

## Email Parsing

The system parses Scapia emails with this format:

```
Subject: Your transaction was successful

Your payment on 31-01-2026 at 11:20 AM using your Scapia Federal RuPay Credit Card ending in 5059 has been successfully processed.

Amount: ₹23.00
Merchant: Mr Arjun Kumar Yadav
```

## AI Categorization

Categories:
1. Food & Dining
2. Transportation
3. Shopping
4. Entertainment
5. Bills & Utilities
6. Healthcare
7. Travel
8. Others

The system uses:
- **Keyword matching** for common merchants (fast)
- **Ollama LLM** for ambiguous cases
- **Learning** from manual corrections

## Troubleshooting

### Ollama not responding
```bash
ollama serve  # Start Ollama
ollama list   # Check installed models
```

### Gmail sync failing
- Verify OAuth credentials in `.env.local`
- Check refresh token is valid
- Re-authorize in Settings if needed

### Database connection issues
```bash
sudo systemctl status mysql
sudo systemctl start mysql
```

## License

MIT

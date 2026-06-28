# ⚒️ ForgeQuest — Digital Factory

A full-stack digital asset marketplace for MMO accounts and gameplay blueprints. Features a storefront, worker portal with screenshot verification, and automated email delivery.

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Storefront   │      │  Worker       │      │   API         │
│  / (static)   │      │  Portal       │      │   /api/*      │
│  index.html   │      │  /worker (EJS)│      │   Express     │
└──────────────┘      └──────────────┘      └──────────────┘
                          │                        │
                    ┌─────┴──────────┐      ┌──────┴──────┐
                    │  Screenshot     │      │  Delivery    │
                    │  Verification   │      │  Automation  │
                    └────────────────┘      └─────────────┘
```

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Storefront landing page with asset catalog |
| `/worker` | Worker portal (tasks, credentials, verification) |
| `/api/health` | Health check |
| `/api/stats` | Dashboard statistics |
| `/api/assets` | List/create digital assets |
| `/api/verify/submit` | Upload milestone screenshot |
| `/api/verify/:id/:action` | Approve/reject verification |
| `/api/deliver` | Trigger automated email delivery |
| `/deliver/:token` | Token-protected asset access |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.template .env
# Edit .env with your SMTP settings

# Seed sample data
node scripts/seed-data.js

# Start server
npm start
# → http://localhost:3000
```

## Deployment

### Option 1: GitHub Actions (recommended)
Push to `main` branch — the `.github/workflows/deploy.yml` workflow auto-deploys.

Required GitHub repository secrets:
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DEPLOY_PATH`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (for email delivery)

### Option 2: Manual deploy
```bash
./deploy.sh
```

### Option 3: Platform hosting
The app is a standard Node.js Express server. Deploy to:
- **Railway** — `railway login && railway up`
- **Render** — Connect GitHub repo, set start command: `node server.js`
- **Fly.io** — `flyctl launch`
- **DigitalOcean App Platform** — Connect repo, set HTTP port to 3000

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address |
| `SMTP_HOST` | (optional) | SMTP server for email delivery |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | (optional) | SMTP username |
| `SMTP_PASS` | (optional) | SMTP password |
| `EMAIL_FROM` | `noreply@forgequest.io` | From address |

## Tech Stack

- **Runtime**: Node.js + Express
- **Templating**: EJS (worker portal)
- **Database**: SQLite via Turso/team-db CLI
- **Email**: Nodemailer (mock in dev, SMTP in production)
- **Storage**: Local filesystem for screenshot uploads
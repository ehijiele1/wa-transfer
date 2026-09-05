# MASTER DOCUMENTATION — wa-transfer
> **This is the SINGLE SOURCE OF TRUTH.** Read this file first. Everything else references from here.
> **Last Updated:** 2026-09-04 | **Version:** 2.2.0 | **Status:** Phase 0 DEPLOYED to Oracle VM (Group Registration)
> **Next Phase:** Phase 1 — Multi-Layer Product Filters

---

## TABLE OF CONTENTS

1. [What This App Does](#1-what-this-app-does)
2. [How It Works (Data Flow)](#2-how-it-works-data-flow)
3. [Prerequisites & Setup](#3-prerequisites--setup)
4. [Step-by-Step: Running the App](#4-step-by-step-running-the-app)
5. [Configuration Reference](#5-configuration-reference)
6. [Architecture Overview](#6-architecture-overview)
7. [Web Management Dashboard (NEW)](#7-web-management-dashboard-new)
8. [Implementation Plan](#8-implementation-plan)
9. [Current Status & Known Issues](#9-current-status--known-issues)
10. [File Reference Map](#10-file-reference-map)
11. [Environment & Infrastructure Map](#11-environment--infrastructure-map)
12. [Continuity Protocol](#12-continuity-protocol)

---

## 1. WHAT THIS APP DOES

### In Plain English
**wa-transfer** watches your WhatsApp groups for real estate listings and promotional offers. It uses AI to understand what each message is about, extracts property details (price, location, bedrooms, etc.), saves everything to a database, then automatically creates Instagram carousel posts and publishes them to Facebook, Twitter, and LinkedIn.

### The 7 Core Functions

| # | Function | What Happens |
|---|----------|--------------|
| 1 | **WhatsApp Monitoring** | Connects to WhatsApp Web, listens to configured groups for new messages |
| 2 | **AI Classification** | Uses Ollama (local LLM) to classify messages as: property, promotion, conversation, or unknown |
| 3 | **Data Extraction** | Extracts structured data: price, location, bedrooms, bathrooms, area, features, images |
| 4 | **Database Storage** | Saves messages, properties, and promotions to Supabase (PostgreSQL) |
| 5 | **Instagram Carousels** | Auto-generates multi-slide carousel posts with AI captions and hashtags |
| 6 | **Social Media Publishing** | Publishes to Facebook, Twitter, LinkedIn with platform-specific formatting |
| 7 | **Analytics & A/B Testing** | Tracks performance, runs A/B tests on content variations |

### Real Estate Flow Example
```
WhatsApp Group Message: "3BR apartment in Sanur, Rp 1.2M, pool, gym, near beach"
    ↓
AI Classification: "property"
    ↓
Extracted: { bedrooms: 3, location: "Sanur", price: 1200000, features: ["pool", "gym"] }
    ↓
Saved to Supabase: property_listings table
    ↓
Instagram Carousel Generated: 6 slides with property details + CTA
    ↓
Published to Instagram + shared to Facebook, Twitter, LinkedIn
```

---

## 2. HOW IT WORKS (DATA FLOW)

### Group Registration (Phase 0 — NEW)
```
User sends "WATM Good Afternoon" in a WhatsApp group
    ↓
WhatsApp service detects trigger message (case-insensitive, trimmed)
    ↓
GroupManager.registerGroup() → Supabase (monitored_groups table)
    ↓
Bot stays SILENT (no reply in group)
    ↓
Group added to in-memory cache (60s TTL, lazy-refreshed)
    ↓
From now on: ALL messages from this group are processed
```

### Message Ingestion
```
WhatsApp Group → whatsapp-web.js (Puppeteer) → WhatsAppService
    → GroupManager.isMonitoredAsync() [NEW: skips non-monitored groups]
    → InputGuard (validation) → MessageCallbacks → MessageProcessingJob
    → Defense-in-depth: GroupManager check again in MessageProcessingJob
```

### AI Processing
```
MessageProcessor → extractText() → Ollama /api/generate → Classification
    → If "property": extractPropertyData() (regex)
    → If "promotion": extractPromotionData()
```

### Storage
```
SupabaseService → anon client (RLS) → property_listings / promotions / whatsapp_messages
    → Fallback to service-role client on RLS failure
```

### Content Generation (Every 5 minutes)
```
JobScheduler → cron */5 * * * * → ContentGenerationJob
    → getUnprocessedProperties() → InstagramCarouselGenerator
    → generateSlides() → generateCaptionAndHashtags() (Ollama)
    → Save to instagram_carousels table
```

### Publishing (Every 1 minute)
```
JobScheduler → cron * * * * * → SocialMediaPublishingJob
    → SocialMediaScheduler.processScheduledPosts()
    → PlatformAdapter.publish() → Facebook/Twitter/LinkedIn APIs
    → Retry with exponential backoff on failure
```

### Health Monitoring (Port 3001)
```
HealthServer → GET /health → HealthService
    → checkDatabase(), checkWhatsApp(), checkOllama(), checkRedis()
    → Returns: { status: "healthy"|"degraded"|"unhealthy", components: {...} }
```

---

## 3. PREREQUISITES & SETUP

### Required
| Software | Version | Purpose | Install |
|----------|---------|---------|---------|
| Node.js | >=20.0.0 | Runtime | https://nodejs.org |
| npm | >=10.0.0 | Package manager | Comes with Node.js |
| Supabase | Any | PostgreSQL database | https://supabase.com (free tier works) |
| Redis | 7+ | Job queue storage | `docker run -d -p 6379:6379 redis:7-alpine` |
| Chromium | Latest | WhatsApp Web automation | Installed automatically by Puppeteer |

### Optional (for AI features)
| Software | Version | Purpose | Install |
|----------|---------|---------|---------|
| Ollama | Latest | Local LLM for classification | https://ollama.ai |
| llama2 model | Any | AI model | `ollama pull llama2` |

### Optional (for social media publishing)
| Service | Purpose | Get Token |
|---------|---------|-----------|
| Instagram Graph API | Carousel publishing | Meta Developer Console |
| Facebook Graph API | Post publishing | Meta Developer Console |
| Twitter API v2 | Tweet publishing | Twitter Developer Portal |
| LinkedIn API | Post publishing | LinkedIn Developer Portal |

---

## 4. STEP-BY-STEP: RUNNING THE APP

### Step 1: Clone & Install
```bash
cd /path/to/WebApps
git clone <repository-url> wa-transfer
cd wa-transfer
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
# REQUIRED: Your Supabase project
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# REQUIRED: WhatsApp groups to monitor (comma-separated group names)
WHATSAPP_SESSION_ID=default
MONITORING_GROUPS=MyRealEstateGroup,AnotherGroup

# REQUIRED: Redis for job queues
REDIS_URL=redis://localhost:6379

# OPTIONAL: AI features
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# OPTIONAL: Social media (replace with real tokens)
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_ACCOUNT_ID=your_account_id
FACEBOOK_ACCESS_TOKEN=your_token
FACEBOOK_PAGE_ID=your_page_id
TWITTER_BEARER_TOKEN=your_token
LINKEDIN_ACCESS_TOKEN=your_token
```

### Step 3: Setup Database
Run these SQL files in your Supabase SQL Editor (in order):
1. `supabase/whatsapp-schema.sql` — Messages, properties, promotions
2. `supabase/instagram-schema.sql` — Instagram carousels
3. `supabase/social-media-schema.sql` — Social media posts, queues, analytics

### Step 4: Start Redis
```bash
# Option A: Docker (recommended)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Option B: Local install
redis-server
```

### Step 5: Start Ollama (Optional)
```bash
# Start Ollama server
ollama serve

# In another terminal, pull the model
ollama pull llama2
```

### Step 6: Build & Run
```bash
# Build TypeScript
npm run build

# Start the application
npm start

# OR for development with auto-reload
npm run dev
```

### Step 7: Connect WhatsApp
1. On first run, a QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to **Settings → Linked Devices → Link a Device**
4. Scan the QR code
5. WhatsApp is now connected

### Step 8: Verify
```bash
# Check health endpoint
curl http://localhost:3001/health

# Check Redis connection
redis-cli ping
# Should return: PONG

# Check BullMQ queues
redis-cli KEYS "bull:*"

# List monitored groups (Phase 0)
npm run groups:list
```

### Step 9: Register WhatsApp Groups (Phase 0)
1. Open WhatsApp on your phone
2. Go to any group you want wa-transfer to monitor
3. Send the exact message: **`WATM Good Afternoon`**
4. The bot stays silent (no reply in the group — silent registration)
5. The group is now registered in Supabase `monitored_groups` table
6. All future messages from this group will be processed
7. Verify with: `npm run groups:list`

**Trigger Message Rules:**
- Case-insensitive (`watm good afternoon` also works)
- Whitespace is trimmed and collapsed
- Only the exact phrase matches — extra text is rejected
- Unregistration (Phase 3): via dashboard or `npm run groups:unregister -- <group_id>`

---

## 5. CONFIGURATION REFERENCE

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGci...` |
| `WHATSAPP_SESSION_ID` | WhatsApp session identifier | `default` |
| `MONITORING_GROUPS` | Comma-separated group names | `Group1,Group2` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | LLM model name | `llama2` |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API token | — |
| `INSTAGRAM_ACCOUNT_ID` | Instagram account ID | — |
| `FACEBOOK_ACCESS_TOKEN` | Facebook page token | — |
| `FACEBOOK_PAGE_ID` | Facebook page ID | — |
| `TWITTER_BEARER_TOKEN` | Twitter API bearer token | — |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth token | — |
| `LOG_LEVEL` | Logging level | `info` |
| `MESSAGE_PROCESSING_INTERVAL_MS` | Processing interval | `30000` |

---

## 6. ARCHITECTURE OVERVIEW

### Technology Stack
- **Runtime:** Node.js 20+ with TypeScript
- **Database:** Supabase (PostgreSQL)
- **Job Queues:** BullMQ + Redis
- **AI/LLM:** Ollama (llama2)
- **WhatsApp:** whatsapp-web.js (Puppeteer-based)
- **Social Media:** Platform-specific REST APIs
- **Health Server:** Native Node.js HTTP server (port 3001)
- **Scheduling:** node-cron (30s, 1min, 5min intervals)
- **Deployment:** Docker + Docker Compose

### Key Services
```
src/
├── index.ts                    # Main orchestrator
├── config/                     # Configuration loaders
├── cli/
│   └── list-monitored-groups.ts  # Phase 0: list/unregister groups
├── services/
│   ├── whatsapp.ts             # WhatsApp Web integration
│   ├── groupManager.ts         # Phase 0: monitored groups registry
│   ├── messageProcessor.ts     # AI classification
│   ├── supabase.ts             # Database operations
│   ├── instagram.ts            # Instagram service
│   ├── instagramCarouselGenerator.ts
│   ├── instagramMedia.ts       # Instagram API calls
│   ├── socialMediaManager.ts   # Cross-platform orchestrator
│   ├── socialMediaScheduler.ts # Post scheduling
│   ├── socialMediaAnalytics.ts # Analytics
│   ├── platformAdapters.ts     # FB/Twitter/LinkedIn adapters
│   ├── abTesting.ts            # A/B testing
│   ├── ollama.ts               # AI/LLM wrapper
│   ├── healthServer.ts         # HTTP health server
│   ├── healthService.ts        # Health checks
│   ├── inputGuard.ts           # Input validation
│   ├── urlGuard.ts             # SSRF protection
│   ├── retryHelper.ts          # Retry logic
│   ├── httpClient.ts           # HTTP with timeouts
│   └── idempotencyService.ts   # Deduplication
├── jobs/
│   ├── JobScheduler.ts         # Cron orchestrator
│   ├── MessageProcessingJob.ts # WhatsApp processing
│   ├── ContentGenerationJob.ts # Instagram generation
│   └── SocialMediaPublishingJob.ts
├── queues/
│   ├── queueManager.ts         # BullMQ wrapper
│   └── processors.ts           # Job processors
├── api/
│   └── health.ts               # Health API
├── types/                      # TypeScript types
└── utils/                      # Shared utilities
    ├── logger.ts               # Structured logging
    ├── circuitBreaker.ts       # Circuit breaker pattern
    ├── fetchWithTimeout.ts     # Timeout protection
    ├── inputValidator.ts       # Input validation
    └── rateLimiter.ts          # Rate limiting
```

### Database Tables
| Table | Purpose |
|-------|---------|
| `monitored_groups` | **Phase 0**: WhatsApp groups registered for monitoring |
| `whatsapp_messages` | Raw WhatsApp messages |
| `property_listings` | Extracted property data |
| `promotions` | Extracted promotions |
| `instagram_carousels` | Generated carousel posts |
| `social_media_posts` | Published social content |
| `social_media_scheduled_posts` | Scheduled post queue |
| `content_queues` | Queue grouping |
| `queue_posts` | Queue-post junction |
| `social_media_analytics` | Performance metrics |
| `ab_tests` | A/B test definitions |
| `ab_test_variants` | Test variants |
| `social_media_performance` | Post performance |

---

## 7. WEB MANAGEMENT DASHBOARD (NEW)

### Purpose
A responsive web application for managing wa-transfer remotely from your phone or any browser when not at your PC.

### Features
| Feature | Description |
|---------|-------------|
| **Authentication** | Secure login with JWT tokens |
| **Dashboard** | Overview of system health, recent activity, key metrics |
| **WhatsApp Monitor** | View incoming messages, connected groups, connection status |
| **Property Listings** | Browse, search, edit extracted properties |
| **Promotions** | Browse, edit extracted promotions |
| **Instagram Carousels** | Preview carousels, approve/edit before publishing |
| **Social Media Queue** | View scheduled posts, cancel/reschedule |
| **Analytics** | Performance charts, engagement metrics |
| **A/B Tests** | Create, monitor, and analyze A/B tests |
| **Settings** | Update configuration, manage API keys |
| **Health Monitor** | Real-time system health status |

### Tech Stack
| Component | Technology | Why |
|-----------|------------|-----|
| Frontend | Next.js 14 (App Router) | React + SSR, fast development |
| UI Library | Tailwind CSS + shadcn/ui | Beautiful, responsive, accessible |
| Auth | NextAuth.js + JWT | Secure, session management |
| API | Next.js API Routes + tRPC | Type-safe API layer |
| Database | Supabase (existing) | Already integrated, RLS for security |
| Real-time | Supabase Realtime | Live updates for messages/health |
| Mobile | Responsive PWA | Installable on phone, works offline |
| Deployment | Vercel or Docker | Easy hosting, auto-scaling |

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                  Web Dashboard (Next.js)             │
│  ┌───────────┬───────────┬───────────┬───────────┐  │
│  │ Dashboard │ Properties│ Carousels │ Analytics │  │
│  └───────────┴───────────┴───────────┴───────────┘  │
│  ┌───────────┬───────────┬───────────┬───────────┐  │
│  │ Messages  │ Queue     │ A/B Tests │ Settings  │  │
│  └───────────┴───────────┴───────────┴───────────┘  │
└──────────────────────────┬──────────────────────────┘
                           │ API (tRPC / REST)
                           ▼
┌─────────────────────────────────────────────────────┐
│              wa-transfer Backend (existing)          │
│  ┌───────────┬───────────┬───────────┬───────────┐  │
│  │ WhatsApp  │ AI/LLM    │ Instagram │ Social    │  │
│  │ Monitor   │ Processor │ Generator │ Publisher │  │
│  └───────────┴───────────┴───────────┴───────────┘  │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                    Supabase (existing)               │
│  ┌───────────┬───────────┬───────────┬───────────┐  │
│  │ Messages  │ Properties│ Carousels │ Analytics │  │
│  └───────────┴───────────┴───────────┴───────────┘  │
└─────────────────────────────────────────────────────┘
```

### Authentication Flow
```
User → Login Page → NextAuth.js → Supabase Auth (email/password)
    → JWT Token → Stored in httpOnly cookie
    → All API requests include JWT
    → Supabase RLS enforces user-level access
```

---

## 8. IMPLEMENTATION PLAN

### Phase 0: Group Registration (Week 1) — ✅ COMPLETE
| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create `monitored_groups` Supabase table + RLS | P0 | 2h | ✅ |
| Build `groupManager.ts` service with cache | P0 | 4h | ✅ |
| Add "WATM Good Afternoon" trigger handler | P0 | 4h | ✅ |
| Defense-in-depth filter in MessageProcessingJob | P0 | 3h | ✅ |
| CLI utility (`npm run groups:list`) | P0 | 2h | ✅ |
| Unit tests for trigger message logic | P0 | 1h | ✅ |
| Documentation updates | P0 | 1h | ✅ |
| **Phase 0 Total** | | **17h** | **✅ DONE** |

**Deliverables:**
- `supabase/migrations/20260903000000_monitored_groups.sql` (new)
- `src/services/groupManager.ts` (new)
- `src/cli/list-monitored-groups.ts` (new)
- `src/services/whatsapp.ts` (modified)
- `src/jobs/MessageProcessingJob.ts` (modified)
- `test/services/groupManager.test.ts` (new — 12 tests pass)
- `package.json` (added `groups:list` scripts)

### Phase 1: Multi-Layer Product Filters (Week 1-2) — ⏳ NEXT
| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Initialize Next.js project | P0 | 4h | ⬜ |
| Setup Tailwind CSS + shadcn/ui | P0 | 4h | ⬜ |
| Configure Supabase client | P0 | 2h | ⬜ |
| Implement auth (NextAuth.js) | P0 | 8h | ⬜ |
| Create login page | P0 | 4h | ⬜ |
| Create layout (sidebar, header) | P0 | 6h | ⬜ |
| Setup API routes | P0 | 4h | ⬜ |
| **Phase 1 Total** | | **32h** | |

### Phase 2: Core Dashboard (Week 2)
| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Dashboard overview page | P0 | 6h | ⬜ |
| Health monitor component | P0 | 4h | ⬜ |
| WhatsApp messages viewer | P1 | 6h | ⬜ |
| Property listings table | P1 | 6h | ⬜ |
| Property detail/edit page | P1 | 6h | ⬜ |
| Promotions viewer | P2 | 4h | ⬜ |
| **Phase 2 Total** | | **32h** | |

### Phase 3: Content Management (Week 3)
| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Instagram carousel preview | P1 | 8h | ⬜ |
| Carousel approve/edit flow | P1 | 6h | ⬜ |
| Social media queue viewer | P1 | 6h | ⬜ |
| Schedule/cancel posts | P1 | 4h | ⬜ |
| Cross-platform publishing UI | P2 | 6h | ⬜ |
| **Phase 3 Total** | | **30h** | |

### Phase 4: Analytics & Settings (Week 4)
| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Analytics dashboard | P2 | 8h | ⬜ |
| Performance charts | P2 | 6h | ⬜ |
| A/B test management | P2 | 6h | ⬜ |
| Settings page | P1 | 4h | ⬜ |
| API key management | P1 | 4h | ⬜ |
| **Phase 4 Total** | | **28h** | |

### Phase 5: Mobile & Polish (Week 5)
| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| PWA manifest + service worker | P1 | 4h | ⬜ |
| Mobile-responsive optimization | P0 | 6h | ⬜ |
| Push notifications (health alerts) | P2 | 6h | ⬜ |
| Offline support | P2 | 4h | ⬜ |
| Error handling & loading states | P1 | 4h | ⬜ |
| **Phase 5 Total** | | **24h** | |

### Phase 6: Deployment & Security (Week 6)
| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Dockerize dashboard | P1 | 4h | ⬜ |
| Deploy to Vercel/Docker | P0 | 4h | ⬜ |
| SSL/HTTPS setup | P0 | 2h | ⬜ |
| Rate limiting | P1 | 3h | ⬜ |
| Security audit | P0 | 4h | ⬜ |
| Environment variable encryption | P1 | 3h | ⬜ |
| **Phase 6 Total** | | **20h** | |

### Total Estimate: ~166 hours (4-6 weeks full-time)

---

## 9. CURRENT STATUS & KNOWN ISSUES

### What Works
- ✅ TypeScript compilation passes
- ✅ Build succeeds
- ✅ Core service architecture is solid
- ✅ Circuit breakers implemented
- ✅ Input validation in place
- ✅ Health server functional
- ✅ Job scheduler with cron jobs
- ✅ BullMQ queue infrastructure

### Known Issues
| Issue | Severity | File | Description |
|-------|----------|------|-------------|
| SSH keys in repo | HIGH | `ssh-wa-transfer-backup.key` | Cannot delete (OneDrive lock) — manual delete needed |
| `.env` has demo JWTs | MEDIUM | `.env` | Supabase keys are demo values, not production |
| Two logger implementations | LOW | `utils/logger.ts` + `services/logger.ts` | Should consolidate |
| Rate limiter not wired | LOW | `utils/rateLimiter.ts` | Created but not used by any service |
| Idempotency service not wired | LOW | `services/idempotencyService.ts` | Created but not used |
| Instagram schedule is mock | MEDIUM | `instagramCarouselGenerator.ts` | `scheduleCarousel()` returns fake response |
| Analytics returns hardcoded data | MEDIUM | `socialMediaAnalytics.ts` | Most methods return dummy data |
| A/B tests stored in memory only | MEDIUM | `abTesting.ts` | Lost on restart |
| `bulkPublish` with 'all' only publishes to Facebook | HIGH | `socialMediaManager.ts` | Should publish to all platforms |
| WhatsApp health check hardcoded | LOW | `healthService.ts` | Always returns `true` |
| Twitter error says "Facebook API error" | LOW | `platformAdapters.ts` | Copy-paste bug |

### ✅ Resolved in Phase 0 (2026-09-03)
- ✅ **WhatsApp group monitoring** — Now works via "WATM Good Afternoon" trigger, registered in Supabase `monitored_groups` table, filtered by `GroupManager.isMonitoredAsync()`

### Production Readiness Score: 7/10
- ✅ Architecture: Solid service-oriented design
- ✅ Security: Circuit breakers, input validation, SSRF protection
- ✅ Group monitoring: Now works via "WATM Good Afternoon" trigger (Phase 0)
- ⚠️ Reliability: Some stubs remain (analytics, A/B testing)
- ⚠️ Observability: Structured logging exists but not fully wired
- ❌ No web dashboard for remote management
- ❌ No automated test suite
- ❌ No CI/CD pipeline

---

## 10. FILE REFERENCE MAP

### Files to Read for Full Understanding
| File | Purpose | When to Read |
|------|---------|--------------|
| `MASTER_DOCUMENTATION.md` | This file — start here | Always first |
| `README.md` | Project overview and quick start | First-time setup |
| `ARCHITECTURE_AUDIT_REPORT.md` | Deep architecture analysis | Understanding design decisions |
| `REMEDIATION_SUMMARY.md` | Current fixes and remaining work | Knowing what's done vs pending |
| `CONTINUATION_GUIDE.md` | Session handoff instructions | Switching LLM sessions |
| `P0_VERIFICATION_REPORT.md` | P0 blocker resolution proof | Verifying critical fixes |
| `OLLAMA_GATEWAY.md` | AI gateway setup | Configuring Ollama access |

### Source Code Files
| Directory | Key Files | Purpose |
|-----------|-----------|---------|
| `src/` | `index.ts` | Main entry point |
| `src/config/` | `index.ts`, `instagram.ts`, `socialMedia.ts` | Configuration |
| `src/services/` | 23 service files (incl. `groupManager.ts` from Phase 0) | Core business logic |
| `src/jobs/` | `JobScheduler.ts`, `*Job.ts` | Scheduled tasks |
| `src/queues/` | `queueManager.ts`, `processors.ts` | BullMQ queues |
| `src/cli/` | `list-monitored-groups.ts` (Phase 0) | CLI utilities |
| `src/api/` | `health.ts` | Health API |
| `src/types/` | `index.ts`, `instagram.ts`, `socialMedia.ts` | Type definitions |
| `src/utils/` | `logger.ts`, `circuitBreaker.ts`, etc. | Shared utilities |
| `test/services/` | `groupManager.test.ts` (Phase 0, 12 tests) | Unit tests |

### Database Schemas / Migrations
| File | Tables / Purpose |
|------|------------------|
| `supabase/migrations/20260728000000_service_role_isolation.sql` | Service-role isolation |
| `supabase/migrations/20260824000000_rls_and_idempotency.sql` | RLS policies + idempotency |
| `supabase/migrations/20260903000000_monitored_groups.sql` | **Phase 0**: `monitored_groups` + `register_group()` RPC + `is_group_monitored()` function |
| `supabase/whatsapp-schema.sql` | `whatsapp_messages`, `property_listings`, `promotions` |
| `supabase/instagram-schema.sql` | `instagram_carousels` + views + functions |
| `supabase/social-media-schema.sql` | `social_media_posts`, `scheduled_posts`, `queues`, `analytics`, `ab_tests` |

### Configuration Files
| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, metadata |
| `tsconfig.json` | TypeScript configuration |
| `jest.config.js` | Test configuration |
| `.eslintrc.json` | Linting rules |
| `docker-compose.yml` | Docker services (app + Redis) |
| `Dockerfile` | Container build |
| `.env` | Environment variables (secrets) |
| `.env.example` | Environment template |

---

## 11. ENVIRONMENT & INFRASTRUCTURE MAP

> **READ THIS FIRST IF YOU ARE A NEW AI MODEL/SESSION.**
> This section registers WHERE every piece of the system physically lives and HOW to inspect/operate each part, so that a change of AI model does not lose the map.
> **Never write secrets into this doc** — secrets live in the `.env` files listed below; register their *locations*, not their *values*.

### 11.1 Machines & Access

| Role | Location | Access |
|------|----------|--------|
| **Dev PC (this machine)** | Windows 10/11 + PowerShell 5.1, VS Code | Direct |
| **wa-transfer workspace** | `C:\Users\ehiji\OneDrive\Desktop\WebApps\wa-transfer` | Git repo, branch `remediation/p0-p1` |
| **VannieJay website** | `C:\Users\ehiji\OneDrive\Desktop\WebApps\New-VannieJay-Website` | Separate Git repo (integration target, Phase 5) |
| **Oracle VM (production)** | `ubuntu@140.238.79.76` — OCI Always Free, x86_64, 2 CPU / 11 GB RAM | SSH key below |
| **SSH key (KEEP — never commit, never delete)** | `C:\Users\ehiji\OneDrive\Desktop\WebApps\wa-transfer\ssh-wa-transfer-backup.key` (+ `.pub`) | `ssh -i <path> ubuntu@140.238.79.76` |
| **Ollama gateway keys** | `C:\Users\ehiji\AppData\Local\Temp\opencode\gateway-keys.txt` | "App1" key = wa-transfer |

### 11.2 Production Runtime (Oracle VM)

- **App dir:** `/home/ubuntu/wa-transfer` (git branch `remediation/p0-p1`)
- **Runtime:** docker-compose → 2 containers.
  | Container | Role | Port | Health |
  |-----------|------|------|--------|
  | `wa-transfer` | App (Node.js, rootfs READ-ONLY) | `3001` | `http://localhost:3001/health` |
  | `wa-transfer-redis` | Redis (BullMQ) | `6379` | — |
- **Ollama:** `127.0.0.1:11434` (models: `qwen2.5:7b`, `nomic-embed-text`). External gateway: `140.238.79.76:8080/app1/` + header `X-API-Key`.
- **Useful commands (ran on the VM):**
  ```bash
  docker-compose logs -f wa-transfer              # app logs
  docker-compose ps                                # status / health
  docker-compose restart                           # quick restart
  docker-compose down && docker-compose build --no-cache && docker-compose up -d   # full rebuild
  docker exec wa-transfer ls /app/dist/cli/        # verify Phase 0 CLI shipped
  docker exec wa-transfer node /app/dist/cli/list-monitored-groups.js   # groups CLI
  ```
  `src/` TS is pre-built to `/app/dist/` at image build time (Dockerfile does the build; container never compiles).
- **GOTCHAS (discovered during Phase 0 deploy):**
  1. Container rootfs is **read-only** — `docker cp` into it fails. Run tiny scripts over stdin: `docker exec -i wa-transfer node - < ./script.js`.
  2. Long SSH commands during heavy image builds get dropped ("Connection closed by remote host") — the build usually **survives**; poll with `ps aux | grep docker-compose` and watch `/tmp/build2.log`.
  3. VM disk previously reached **99% full** (56 docker images ≈ 29.5 GB). Before a `--no-cache` rebuild run a prune: `docker image prune -af && docker container prune -f`. Check space: `df -h /`.
  4. If `git status` on the VM shows unexpected modifications, **inspect before building** — the VM has had manual edits in past sessions.

### 11.3 Database (Supabase)

| Item | Location / Value |
|------|------------------|
| **Real project (production)** | `https://eqrjcwuaqhzajvcarqmb.supabase.co` — URL + keys live in the VM's `/home/ubuntu/wa-transfer/.env` (baked into the image at build time) |
| **Local PC `.env`** | `C:\Users\ehiji\OneDrive\Desktop\WebApps\wa-transfer\.env` — currently points to `http://localhost:54321` (Supabase **demo/local** keys!). **Do not deploy from this file.** This was a root cause of the original "product not working" |
| **Dashboard** | https://supabase.com/dashboard — apply migrations via SQL Editor of project `eqrjcwuaqhzajvcarqmb` |

**Migration register (applied status):**
| Migration | Purpose | Status |
|-----------|---------|--------|
| `supabase/migrations/20260728000000_service_role_isolation.sql` | Service-role isolation | ✅ applied |
| `supabase/migrations/20260824000000_rls_and_idempotency.sql` | RLS + idempotency | ✅ applied |
| `supabase/migrations/20260903000000_monitored_groups.sql` | **Phase 0** — `monitored_groups` + RPCs | ⚠️ must exist in `eqrjcwuaqhzajvcarqmb`; if `PGRST205 / table not found`, re-apply in SQL Editor. To force PostgREST schema reload: `select pg_notify('pgrst','reload schema');` |

The app connects with the **anon key** + RLS (policies `allow anon all monitored_groups`). Service-role key exists as fallback in SupabaseService.

### 11.4 Git State Register (update after every deploy)

| Repo | Branch | HEAD (as of 2026-09-04) | Notes |
|------|--------|--------------------------|-------|
| **Local PC** (source of truth) | `remediation/p0-p1` | `d9f5cc8` — Phase 0 | remote `https://github.com/ehijiele1/wa-transfer.git` |
| **GitHub** | `remediation/p0-p1` | `d9f5cc8` | pushed 2026-09-04 using owner-account token (see 11.5) |
| **Oracle VM** | `remediation/p0-p1` | `d9f5cc8` | pulled 2026-09-04 after `git stash` + untracked-backup |
| **VM stash** (recoverable) | — | `stash@{0}` "duplicate-of-318f93d pre-sync" | duplicate edits from a previous VM session; verified identical to commit `318f93d` |
| **VM backup dir** | — | `.sync-backup-vm-untracked/` (`/home/ubuntu/wa-transfer`) | previous VM-untracked `scripts/pair-code.js` + `docker/entrypoint.sh` moved here during sync; both verified **identical** to tracked versions |

### 11.5 Canonical Deploy / Code-Sync Workflow

1. **Develop** on the local PC.
2. **Verify:** `npm run typecheck && npm run build && npm test`.
3. **Commit.**
4. **Push to GitHub** (requires the OWNER account token, not the active gh account):
   ```powershell
   $t = gh auth token -u ehijiele1
   git push "https://x-access-token:$t@github.com/ehijiele1/wa-transfer.git" remediation/p0-p1
   ```
   gh accounts present on this PC: `powerhousemediaegbeda` (**active**), `ehijiele1` (owner), `VannieJay`. The VannieJay credential gets **403** on this repo.
5. **Pull on the VM:**
   ```bash
   ssh -i <ssh-key> ubuntu@140.238.79.76
   cd /home/ubuntu/wa-transfer && git pull origin remediation/p0-p1
   ```
   If an **untracked file would be overwritten**, move it to `.sync-backup-vm-untracked/` (never `rm` blindly — back it up, then diff against the incoming tracked file).
6. **Rebuild + restart:** `docker-compose down && docker-compose build --no-cache && docker-compose up -d` (prune docker images first if disk tight — see 11.2).
7. **Verify:** `curl localhost:3001/health` → `healthy`; then the checks in 11.2.

### 11.6 VannieJay Website (Phase 5 integration target)

| Item | Location |
|------|----------|
| Workspace | `C:\Users\ehiji\OneDrive\Desktop\WebApps\New-VannieJay-Website` |
| Stack | Vite + React + TypeScript (`vercel.json` = Vercel deploy). **NOT WordPress** |
| **Products source of truth** | `src/data/products.json` — single file to edit for all product content |
| Chatbot | `api/chat.mjs` — Gemini proxy endpoint (Vercel serverless) |
| Handbook | `HANDBOOK.md` (in that repo) |
| Deployment | Vercel (vanniejay.com.ng) |

Integration plan: **wa-transfer → website sync via Git-based PR with auto-merge for all changes** (image hosting via cloud storage — Vercel Blob / Supabase Storage).

---

## 12. CONTINUITY PROTOCOL

### When Switching LLM Models

1. **Read this file first** (`MASTER_DOCUMENTATION.md`)
2. **Read `CONTINUATION_GUIDE.md`** for session-specific context
3. **Check the Implementation Plan** (Section 8) for current phase and next tasks
4. **Review `REMEDIATION_SUMMARY.md`** for pending code changes

### When Updating Code

1. **Update this file** (MASTER_DOCUMENTATION.md) with any changes
2. **Update `CONTINUATION_GUIDE.md`** with session notes
3. **Update `REMEDIATION_SUMMARY.md`** with completed/pending items
4. **Update the Implementation Plan** (Section 8) with task status

### When Adding Features

1. **Document in Section 7** (Web Management Dashboard) if it's a dashboard feature
2. **Document in Section 6** (Architecture Overview) if it changes architecture
3. **Update Section 10** (File Reference Map) with new files
4. **Update Section 9** (Current Status) with new known issues

### File Update Checklist
- [ ] `MASTER_DOCUMENTATION.md` — Update sections 8, 9, 10 as needed
- [ ] `CONTINUATION_GUIDE.md` — Add session notes
- [ ] `REMEDIATION_SUMMARY.md` — Mark items complete/pending
- [ ] `README.md` — Update if setup steps change

---

## QUICK REFERENCE COMMANDS

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (production)
npm start

# Run (development)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test

# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Check health
curl http://localhost:3001/health

# Check Redis
redis-cli ping

# View logs (Docker)
docker-compose logs -f wa-transfer
```

---

*This document is the master reference for the wa-transfer project. All other documentation files are supplementary. When in doubt, start here.*

*Last updated by: opencode/big-pickle — 2026-09-04 (Phase 0 deployed to Oracle VM; Section 11 Environment Map added)*
*Next update scheduled: After Phase 1 completion (Web Dashboard foundation)*

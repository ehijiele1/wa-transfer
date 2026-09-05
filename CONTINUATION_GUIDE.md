# Continuation Guide for wa-transfer
> **Last Updated:** 2026-09-03
> **Current Status:** Phase 0 Complete, Phase 1 Ready
> **Next LLM/Agent:** Read `MASTER_DOCUMENTATION.md` FIRST, then this file

---

## PROJECT CONTEXT

**wa-transfer** is a WhatsApp Business Intelligence & Social Media Automation System. It monitors WhatsApp groups for real estate listings, uses AI (Ollama) for classification, stores data in Supabase, and automates publishing to Instagram/Facebook/Twitter/LinkedIn.

**Repository:** `c:/Users/ehiji/OneDrive/Desktop/WebApps/wa-transfer`

---

## MASTER FILE HIERARCHY

```
START HERE (always)
    │
    ▼
MASTER_DOCUMENTATION.md ← Single source of truth
    │
    ├── README.md ← Quick start guide
    ├── CONTINUATION_GUIDE.md ← This file (session handoff)
    ├── REMEDIATION_SUMMARY.md ← What's done vs pending
    ├── ARCHITECTURE_AUDIT_REPORT.md ← Deep architecture analysis
    ├── P0_VERIFICATION_REPORT.md ← Critical fix verification
    └── OLLAMA_GATEWAY.md ← AI gateway setup
```

**Rule:** When switching LLM sessions, ALWAYS read `MASTER_DOCUMENTATION.md` first. It references all other files.

---

## WHAT'S BEEN DONE (As of 2026-09-03)

### Phase 0: Group Registration ✅ COMPLETE
- [x] Created `monitored_groups` Supabase table + RLS + indexes
- [x] Created `register_group()` and `is_group_monitored()` SQL functions
- [x] Built `GroupManager` service with in-memory cache (60s TTL)
- [x] Added "WATM Good Afternoon" trigger handler in WhatsApp service
- [x] Silent registration (no reply in group)
- [x] Defense-in-depth filter in MessageProcessingJob
- [x] CLI utility: `npm run groups:list`
- [x] 12 unit tests for GroupManager — all passing
- [x] Documentation updated (MASTER_DOCUMENTATION.md)

### Backend Infrastructure ✅
- [x] TypeScript compilation passes (`npm run typecheck` — zero errors)
- [x] Build succeeds (`npm run build`)
- [x] Structured logging (Pino) — all 11 service files migrated
- [x] Fetch timeouts — `src/utils/fetchWithTimeout.ts`
- [x] Circuit breakers — `src/utils/circuitBreaker.ts` (7 instances)
- [x] Input validation — `src/utils/inputValidator.ts` + `src/services/inputGuard.ts`
- [x] SSRF protection — `src/services/urlGuard.ts`
- [x] Least-privilege Supabase — anon/service client split
- [x] BullMQ + Redis job queues — `src/queues/queueManager.ts`
- [x] Node-cron job scheduler — `src/jobs/JobScheduler.ts`
- [x] Health server (port 3001) — `src/services/healthServer.ts`
- [x] Container hardening — `docker-compose.yml` with security options
- [x] Dependencies installed — `node_modules/` present (494 packages)
- [x] Build output populated — `dist/` folder complete

### Documentation ✅
- [x] `MASTER_DOCUMENTATION.md` — Single source of truth (updated for Phase 0)
- [x] `README.md` — Comprehensive project documentation
- [x] `ARCHITECTURE_AUDIT_REPORT.md` — Deep architecture analysis
- [x] Outdated markdown files removed (4 files deleted)

### Code Fixes ✅
- [x] `jest.config.js` — Fixed `moduleNameMapping` → `moduleNameMapper`
- [x] Duplicate `wa-transfer/` folder — Removed

---

## WHAT REMAINS (Prioritized)

### ✅ Phase 0: Group Registration (COMPLETE — 2026-09-03)
- ✅ Created `monitored_groups` Supabase table
- ✅ Built `GroupManager` service with cache
- ✅ Added "WATM Good Afternoon" trigger handler
- ✅ Defense-in-depth filter in MessageProcessingJob
- ✅ CLI utility + unit tests
- ✅ Documentation updated
- **Next:** Deploy to Oracle VM and test end-to-end

### Phase 1: Multi-Layer Product Filters (NEXT — Start now)
1. Create `user_preferences` Supabase table
2. Build property filter engine (type, price, location, bedrooms)
3. Build developer matching (Pertinence Group, OG Holdings, etc.)
4. Build investment criteria filter (ROI, payment plan, title type)
5. Enhance Ollama to interpret natural language preferences
6. Add confidence scoring (≥0.8 = auto-publish, <0.8 = manual review)

### P0 — Critical (Remaining backend)
1. **Deploy Phase 0 to Oracle VM** — Test end-to-end
2. **SSH keys in repo root** — `ssh-wa-transfer-backup.key` cannot be deleted (OneDrive lock). KEEP — needed for Oracle VM access.
3. **Wire remaining circuit breakers** — `platformAdapters.ts` (Facebook/Twitter/LinkedIn publish methods) and `instagramMedia.ts` still use raw `fetch()`.

### P1 — High Priority
4. **Web Management Dashboard** — See `MASTER_DOCUMENTATION.md` Section 7-8 for full plan.
5. **Fix `bulkPublish` with 'all' platform** — Currently only publishes to Facebook, should publish to all platforms.
6. **Consolidate duplicate loggers** — `utils/logger.ts` vs `services/logger.ts` — choose one.
7. **Wire rate limiter** — `src/utils/rateLimiter.ts` created but not used by any service.

### P2 — Nice to Have
8. **Write more automated tests** — Expand beyond GroupManager (currently 12 tests)
9. **Fix hardcoded analytics** — `socialMediaAnalytics.ts` returns dummy data
10. **Fix A/B test persistence** — Currently in-memory only, lost on restart
11. **Content policy layer** — Profanity filter, human-in-the-loop approval

---

## WEB DASHBOARD — NEW INITIATIVE

### Summary
A Next.js web application for managing wa-transfer remotely from phone/browser.

### Tech Stack
- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
- **Auth:** NextAuth.js + Supabase Auth
- **API:** Next.js API Routes + tRPC
- **Database:** Supabase (existing)
- **Mobile:** Responsive PWA

### Implementation Phases
| Phase | Duration | Focus |
|-------|----------|-------|
| 1 | Week 1 | Foundation (Next.js, Auth, Layout) |
| 2 | Week 2 | Core Dashboard (Overview, Messages, Properties) |
| 3 | Week 3 | Content Management (Carousels, Queue, Publishing) |
| 4 | Week 4 | Analytics & Settings |
| 5 | Week 5 | Mobile & Polish (PWA, Offline, Push) |
| 6 | Week 6 | Deployment & Security |

**Full plan:** See `MASTER_DOCUMENTATION.md` Section 8

---

## HOW TO CONTINUE

### If Starting a New Session
1. Read `MASTER_DOCUMENTATION.md` (required — single source of truth)
2. Read this file (`CONTINUATION_GUIDE.md`)
3. Check `REMEDIATION_SUMMARY.md` for pending items
4. Start with P0 items, then P1, then P2

### If Working on Web Dashboard
1. Read `MASTER_DOCUMENTATION.md` Sections 7-8
2. Start with Phase 1: Initialize Next.js project
3. Update this file and `MASTER_DOCUMENTATION.md` after each phase

### If Fixing Backend Issues
1. Read `MASTER_DOCUMENTATION.md` Section 9 (Known Issues)
2. Read `ARCHITECTURE_AUDIT_REPORT.md` for context
3. Fix issues, then update this file

---

## WHERE EVERYTHING IS (fast map)

> **FULL MAP:** `MASTER_DOCUMENTATION.md` → **Section 11 (Environment & Infrastructure Map)**. This is the authoritative location register for ANY new AI model/session.

| Item | Location |
|------|----------|
| Dev PC | Windows + PowerShell 5.1, `C:\Users\ehiji\OneDrive\Desktop\WebApps\wa-transfer` (branch `remediation/p0-p1`) |
| VannieJay website (Phase 5 target) | `C:\Users\ehiji\OneDrive\Desktop\WebApps\New-VannieJay-Website` (`src/data/products.json` = product source of truth) |
| Oracle VM (production) | `ubuntu@140.238.79.76`, app dir `/home/ubuntu/wa-transfer`, docker-compose (`wa-transfer` :3001, `wa-transfer-redis` :6379), Ollama `:11434` + gateway `:8080/app1/` |
| SSH key (KEEP, never commit) | `C:\Users\ehiji\OneDrive\Desktop\WebApps\wa-transfer\ssh-wa-transfer-backup.key` |
| Supabase production project | `eqrjcwuaqhzajvcarqmb.supabase.co` (keys in VM `.env`; local `.env` = localhost demo — do NOT deploy from it) |
| Ollama gateway keys | `C:\Users\ehiji\AppData\Local\Temp\opencode\gateway-keys.txt` |
| GitHub push token path | `gh auth token -u ehijiele1` (owner account; the *active* gh account is `powerhousemediaegbeda` and cannot push this repo) |
| Git state | Local `d9f5cc8` · GitHub `d9f5cc8` · VM `d9f5cc8` (2026-09-04) |

### Deployment / Rebuild (canonical)
1. Local: `npm run typecheck && npm run build && npm test` → `git commit`
2. Push: `$t = gh auth token -u ehijiele1; git push "https://x-access-token:$t@github.com/ehijiele1/wa-transfer.git" remediation/p0-p1`
3. VM: `cd /home/ubuntu/wa-transfer && git pull origin remediation/p0-p1` (if untracked-file conflict, move the file to `.sync-backup-vm-untracked/` first)
4. VM: `docker-compose down && docker-compose build --no-cache && docker-compose up -d` (prune docker images first if disk >90%: `docker image prune -af && docker container prune -f`)
5. Verify: `curl localhost:3001/health` + `docker exec wa-transfer ls /app/dist/cli/`

---

## QUICK COMMANDS

```bash
# Install
npm install

# Build
npm run build

# Run
npm start

# Dev mode
npm run dev

# Type check
npm run typecheck

# Health check
curl http://localhost:3001/health

# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

---

## SUCCESS CRITERIA

### Backend (Current)
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds
- [ ] `npm start` launches without errors (needs Redis + Supabase)
- [ ] Health endpoint returns `{"status": "healthy"}`
- [ ] All circuit breakers wired
- [ ] Input validation on all entry points
- [ ] SSH keys removed from repo

### Web Dashboard (New)
- [ ] Next.js project initialized
- [ ] Authentication working
- [ ] Dashboard overview page
- [ ] Property management
- [ ] Carousel preview/approve
- [ ] Social media queue
- [ ] Analytics charts
- [ ] Mobile-responsive
- [ ] PWA installable
- [ ] Deployed to production

---

*This file ensures continuity across LLM sessions. Always update it when making changes.*
*Last updated: 2026-09-04 (added "Where Everything Is" map → MASTER_DOCUMENTATION.md §11)*

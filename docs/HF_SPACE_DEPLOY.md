# Deploying wa-transfer to Hugging Face Spaces (free, 24/7)

This is the always-on home for the WhatsApp monitoring daemon while the Oracle
VPS is unavailable. **Cost: $0.** Free Space hardware: 2 vCPU / 16 GB RAM.

Why a Space works here:

- Runs our existing Dockerfile (whatsapp-web.js needs Chromium — already in the image)
- Outbound HTTPS is allowed, so the WhatsApp Web socket connects fine
- The WhatsApp session lives in **Supabase** (`wa_sessions` table), so the pairing
  survives restarts, sleeps, and even moving hosts later (Oracle when it's back)
- The GitHub Actions keep-alive workflow (`.github/workflows/hf-space-keepalive.yml`)
  pings `/health` every 30 min so the Space never sleeps

## Prerequisites (all free)

1. Hugging Face account — https://huggingface.co/join (no card)
2. The **shared VannieJay Supabase project** URL + `anon` key + `service_role` key
   (Supabase dashboard → Settings → API)
3. A free **NVIDIA NIM** API key — https://build.nvidia.com (no card, ~40 req/min,
   no daily cap). This is the "never run out of tokens" LLM. (Optional: use your own
   Ollama instead with `LLM_PROVIDER=ollama`.)
4. Apply the session migration to Supabase:
   `supabase/migrations/20261011000000_wa_sessions.sql`
   (SQL editor in the Supabase dashboard, or `supabase db push`)

## Step 1 — Create the Space

1. https://huggingface.co/new-space → **Docker** SDK, **Blank** template, name it
   `wa-transfer`, visibility **Private**.
2. Note the Space URL: `https://<your-hf-username>-wa-transfer.hf.space`

## Step 2 — Push the code

```bash
cd WebApps/wa-transfer
git remote add hf https://huggingface.co/spaces/<your-hf-username>/wa-transfer
# The Space needs the README frontmatter (sdk: docker, app_port: 7860)
cp hf-space/README.md README.md
git add README.md
git commit -m "chore: HF Space README metadata"
git push hf main
```

HF builds the image on push. Watch the build in the Space's **Logs** tab.

## Step 3 — Set Space secrets (Settings → Variables and secrets)

| Secret | Value |
|---|---|
| `SUPABASE_URL` | shared website Supabase project URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (server-side only) |
| `WHATSAPP_SESSION_ID` | `wa-transfer` |
| `WHATSAPP_PAIRING_NUMBER` | your phone in international format, e.g. `2348012345678` |
| `MONITORING_GROUPS` | comma-separated group IDs (use `npm run groups:list` to find them) |
| `WA_SESSION_STORE` | `supabase` |
| `LLM_PROVIDER` | `openai-compatible` |
| `LLM_API_KEY` | your NVIDIA NIM key |
| `OLLAMA_BASE_URL` | `https://integrate.api.nvidia.com/v1` |
| `OLLAMA_MODEL` | a NIM model, e.g. `meta/llama-3.1-8b-instruct` |
| `PORT` | `7860` |
| `HEALTH_SERVER_PORT` | `7860` |
| `LOG_LEVEL` | `info` |

(`REDIS_URL` can be left unset on the Space — job queues degrade gracefully with
logged errors; the core monitoring loop doesn't need them.)

Restart the Space after saving secrets.

## Step 4 — Pair WhatsApp

1. Open the Space **Logs**.
2. On first boot with no stored session, the app requests a **pairing code** for
   `WHATSAPP_PAIRING_NUMBER` — it appears in the logs (and a QR may be logged).
3. On your phone: WhatsApp → Linked devices → Link with phone number → enter the code.
4. The session is now saved to Supabase — **never pair again**, on any host.

## Step 5 — Keep-alive + verify

1. In the GitHub repo (`ehijiele1/wa-transfer`): Settings → Secrets → add
   `HF_SPACE_URL` = your Space URL (no trailing slash).
2. Wait for the next 30-min cron run (or run the workflow manually from Actions).
3. Verify: `curl https://<space-url>/health` → `{"status":"ok",...}`
4. Post a property flier in a monitored group → within a minute, the website
   dashboard (ContentPipeline) shows a `pending` / `whatsapp-ingest` draft.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Space "sleeping" / slow first response | Keep-alive secret missing — add `HF_SPACE_URL` |
| WhatsApp logged out repeatedly | `WA_SESSION_STORE` not `supabase`, or `wa_sessions` migration not applied |
| "WebSocket connection failed" in logs | Space was woken mid-connect; the client auto-retries (3 attempts) |
| LLM errors `401` | Wrong `LLM_API_KEY` or `OLLAMA_BASE_URL` missing `/v1` |
| Rate limits from NIM | Free tier ~40 req/min — reduce polling intervals via env |
| Groups not monitored | Send `WATM Good Afternoon` in the group first (registers it silently) |

## Migrating to Oracle later

When the Oracle instance is back: deploy the same `docker-compose.yml` stack there
with the same env vars. Because the session lives in Supabase, you may need to stop
the Space first (or accept a brief re-link) — but no re-pairing is ever required.

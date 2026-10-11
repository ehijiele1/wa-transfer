---
title: wa-transfer
emoji: 📡
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# wa-transfer — WhatsApp monitoring daemon (VannieJay)

Monitors registered WhatsApp groups for real-estate listings, extracts them with an
LLM, and hands them off to the VannieJay website pipeline as `content_items` drafts.

- Health endpoint: `/health` and `/readiness` (used by the GitHub Actions keep-alive ping)
- Session is stored in Supabase (`wa_sessions` table) — survives restarts and host changes
- LLM: Ollama (local) or any OpenAI-compatible endpoint (e.g. NVIDIA NIM) via env vars
- Deploy runbook: `docs/HF_SPACE_DEPLOY.md` in the GitHub repo

# Remediation Plan

Date: 2026-07-26
Model: MAI-Code-1-Flash
Scope: Documentation-only remediation plan derived from the production-readiness audit. No build or runtime changes are performed in this step.

## Guiding Principles
- Treat this system as an early-stage automation prototype until the highest-risk issues are addressed.
- Prioritize security, reliability, and recovery over feature expansion.
- Make changes in small, verifiable increments with clear acceptance criteria.

---

## P0 — Blockers Before Any Public or Production Use

### 1. Resolve the runtime dependency and startup failure
- Problem: The current test and startup path fails because the runtime cannot resolve the WhatsApp dependency chain.
- Action:
  - Verify package installation and dependency resolution for the active runtime.
  - Remove dependency drift between the root app and the nested duplicate app.
  - Ensure the startup path can initialize the WhatsApp service without module-resolution failure.
- Deliverables:
  - A working startup path.
  - A reliable smoke test that exercises initialization successfully.
- Acceptance criteria:
  - The application can start without module-resolution errors.
  - The existence and version of the WhatsApp runtime dependency are verified in the active package manifest.

### 2. Remove or constrain service-role database access
- Problem: The app uses privileged Supabase access directly from application logic, which is a major security concern.
- Action:
  - Replace service-role usage in ordinary runtime flows with a least-privilege client.
  - Reserve service-role credentials for explicit administrative operations only.
  - Review table policies and ensure the application only writes data it is intended to own.
- Deliverables:
  - A documented credential strategy.
  - A clear split between normal app clients and admin-only clients.
- Acceptance criteria:
  - No normal message-processing path uses broad privileged credentials.
  - Database access follows the minimum needed permissions principle.

### 3. Make queueing and scheduling durable
- Problem: The scheduler and queue modules contain stubbed persistence logic, which makes scheduling unreliable after restarts or failures.
- Action:
  - Implement a persistent store for scheduled jobs and queue state.
  - Make retries idempotent and recoverable.
  - Add a recovery path for jobs left in processing or retry states after crashes.
- Deliverables:
  - Persistent job state.
  - A restart-safe processing model.
- Acceptance criteria:
  - A restarted process can recover queued work without data loss or duplicate publication risk.

### 4. Introduce input validation and content quarantine for untrusted message content
- Problem: WhatsApp messages and remote media are used in LLM prompts and outbound publishing without strong safety checks.
- Action:
  - Validate message content size, structure, and allowed characters.
  - Block or quarantine suspicious content before it enters the AI pipeline.
  - Reject or sanitize unsafe remote media URLs before download or publishing.
- Deliverables:
  - A validation layer for inbound content.
  - A quarantine or refusal policy for unsafe input.
- Acceptance criteria:
  - Malformed or unexpectedly large content does not enter the content-generation pipeline.
  - The system can safely decline suspicious messages.

### 5. Add hard timeouts and circuit breakers for external integrations
- Problem: External requests can hang indefinitely or fail repeatedly without a controlled degradation path.
- Action:
  - Enforce explicit request timeout values for Ollama, Supabase, Instagram, Facebook, Twitter, and LinkedIn clients.
  - Implement retry budgets and circuit-breaking rules.
  - Avoid cascading failures when one provider is unavailable.
- Deliverables:
  - Standardized timeout and error-handling policy.
  - A provider failure strategy that degrades gracefully.
- Acceptance criteria:
  - External API failures do not hang the worker indefinitely.
  - The system fails loudly and predictably when providers are unhealthy.

---

## P1 — High Priority Improvements

### 6. Refactor the orchestrator into smaller workflows
- Problem: The main application entrypoint is doing too much and couples many responsibilities.
- Action:
  - Split startup, message ingestion, classification, persistence, publishing, and queue processing into distinct workflow components.
  - Introduce explicit workflow boundaries and state transitions.
- Deliverables:
  - A workflow-oriented module structure.
  - Clear separation of responsibilities between services.
- Acceptance criteria:
  - Each workflow can be tested and reasoned about independently.

### 7. Add idempotency and deduplication controls
- Problem: The same message or post could be processed more than once, especially during retries or rescheduling.
- Action:
  - Introduce stable message and content IDs.
  - Use idempotency keys or deduplication checks before persistence and publishing.
- Deliverables:
  - A deduplication strategy for inbound messages and outbound posts.
- Acceptance criteria:
  - Reprocessing the same event does not create duplicate records or duplicate publishes.

### 8. Improve observability and operational safety
- Problem: Logging is present but not structured enough to support incident response or product operations.
- Action:
  - Add structured logs with consistent identifiers.
  - Redact sensitive values and provider credentials.
  - Add health, readiness, and dependency-check endpoints or status hooks.
- Deliverables:
  - Operational logging standard.
  - A health report for the worker and its dependencies.
- Acceptance criteria:
  - Operators can determine whether the service, database, and external providers are healthy.

### 9. Harden the container/runtime posture
- Problem: The deployment environment is relatively permissive and not clearly protected against misuse.
- Action:
  - Review the container image for least-privilege execution.
  - Avoid embedding unnecessary secrets or auth state in local files.
  - Ensure the runtime environment uses explicit, non-default security settings.
- Deliverables:
  - A hardened deployment checklist.
  - Clear runtime secret-handling instructions.
- Acceptance criteria:
  - The deployment path is explicit about what credentials are needed and where they live.

### 10. Introduce a content policy layer for AI-generated posts
- Problem: AI-generated captions and social posts can create brand, compliance, or quality issues.
- Action:
  - Add a policy layer that reviews generated output before publication.
  - Define acceptable content patterns, redaction rules, and fallback behavior.
- Deliverables:
  - A content policy document and enforcement hooks.
- Acceptance criteria:
  - Generated content can be blocked or revised before it goes live.

---

## P2 — Nice-to-Have Improvements

### 11. Consolidate the duplicated application copy
- Problem: The repository contains a root app and a nested duplicate app, which increases drift risk.
- Action:
  - Select one canonical code path.
  - Remove or archive the duplicate copy.
- Deliverables:
  - A single maintained application entrypoint.

### 12. Expand automated testing beyond smoke checks
- Problem: The current tests are insufficient for production confidence.
- Action:
  - Add unit and integration tests around classification, persistence, queue handling, and provider adapters.
- Deliverables:
  - A more trustworthy regression suite.

### 13. Improve rate limiting and backpressure management
- Problem: The system can generate bursts of work or outbound requests without controlled throttling.
- Action:
  - Add per-provider rate-limit handling and backlog controls.
- Deliverables:
  - A throttling and queue-backpressure strategy.

---

## Suggested Execution Order

1. Fix runtime dependency/startup failure.
2. Replace privileged database access with a safer pattern.
3. Implement durable scheduling and job recovery.
4. Add content validation and quarantine rules.
5. Add external-request timeouts and circuit breakers.
6. Refactor the orchestrator into smaller workflows.
7. Add observability, idempotency, and policy controls.
8. Consolidate the duplicate app and strengthen test coverage.

---

## Definition of Done for the Remediation Program
The remediation effort is complete when:
- the application can start and initialize reliably,
- sensitive credentials are no longer overused,
- scheduled work is durable and restart-safe,
- untrusted content is safely validated before AI and publishing steps,
- and operators have enough visibility to manage incidents.

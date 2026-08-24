# CrewAI Remediation Crew for wa-transfer

This directory contains CrewAI agents and tasks to complete the pending remediation items for the wa-transfer application.

## Prerequisites

1. **Python 3.10+** installed
2. **CrewAI** installed (`pip install crewai`)
3. **OpenAI API key** (or compatible LLM) set in environment
4. **Node.js 20+** installed (for TypeScript compilation verification)
5. **Redis** running locally or via Docker

## Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY=your-api-key-here
export REDIS_URL=redis://localhost:6379

# Optional: If using local LLM (Ollama)
export OPENAI_API_KEY=ollama
export OPENAI_API_BASE=http://localhost:11434
```

## Running the Crew

### Option 1: Run All Tasks (Sequential)
```bash
python crew.py
```

This runs all 8 tasks in sequence:
1. Wire JobScheduler into index.ts
2. Add circuit breakers to platform adapters
3. Add input validation to message processing
4. Add circuit breakers to Instagram media
5. Write unit tests
6. Write integration tests
7. Verify TypeScript compilation
8. Final code quality review

### Option 2: Run Specific Task
```python
from crewai import Crew, Process
from crew import create_agents, create_tasks

agents = create_agents()
tasks = create_tasks(agents)

# Run only the integration task
crew = Crew(
    agents=[agents['integration_specialist']],
    tasks=[tasks['wire_jobscheduler']],
    process=Process.sequential,
    verbose=True
)

result = crew.kickoff()
print(result)
```

## Agent Roles

| Agent | Responsibility | Tasks |
|-------|---------------|-------|
| **integration_specialist** | Wire JobScheduler into index.ts | wire_jobscheduler |
| **security_hardening_specialist** | Add circuit breakers/timeouts | add_circuit_breakers, add_instagram_circuit_breakers |
| **validation_specialist** | Add input validation | add_input_validation |
| **test_automation_engineer** | Write tests | write_utility_tests, write_integration_tests |
| **code_quality_lead** | Verify TypeScript and code quality | verify_typescript, final_quality_review |

## Expected Outputs

After successful execution:

1. **src/index.ts** - Fully wired to JobScheduler
2. **src/services/platformAdapters.ts** - All fetch calls have circuit breakers
3. **src/services/instagramMedia.ts** - All fetch calls have circuit breakers
4. **src/services/messageProcessor.ts** - Input validation integrated
5. **tests/** - Unit and integration tests created
6. **Zero TypeScript errors**
7. **Zero console.* calls** in src/

## Monitoring Progress

The crew outputs detailed logs showing:
- Agent actions and reasoning
- File modifications
- Test results
- TypeScript compilation status

## Troubleshooting

### LLM Connection Issues
If using Ollama locally:
```bash
# Start Ollama
ollama serve

# In another terminal, pull a model
ollama pull llama3.1:70b
```

### Redis Not Running
```bash
# Start with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or start locally
redis-server
```

### TypeScript Errors
If agents introduce type errors, run manually:
```bash
npm run typecheck
npm run build
```

## CrewAI Configuration

The crew is configured in:
- `agents.yaml` - Agent definitions
- `tasks.yaml` - Task definitions
- `crew.py` - Orchestration logic

To modify agent behavior, edit `agents.yaml`. To add/remove tasks, edit `tasks.yaml`.

## Success Criteria

The crew is successful when:
- [ ] All 8 tasks complete without errors
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (if tests exist)
- [ ] No `console.*` calls in `src/`
- [ ] All external API calls have timeouts
- [ ] All external API calls have circuit breakers
- [ ] Input validation covers all entry points

## Estimated Time

- **Agent execution:** 30-60 minutes (depends on LLM speed)
- **Manual verification:** 30 minutes
- **Bug fixes:** 1-2 hours
- **Total:** 2-3 hours to production-ready code

## Next Steps After Crew Completes

1. Review all file changes
2. Run `npm install` to install new dependencies
3. Run `npm run build` to verify compilation
4. Start Redis: `docker-compose up -d redis`
5. Update Supabase RLS policies (SQL in REMEDIATION_SUMMARY.md)
6. Run `npm start` and verify health endpoint
7. Remove `wa-transfer/` duplicate folder
8. Deploy to production
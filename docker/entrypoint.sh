#!/bin/sh

# Docker entrypoint script for wa-transfer
# Handles startup, readiness polling, and graceful shutdown

set -e

APP_NAME="wa-transfer"
HEALTH_CHECK_URL="http://127.0.0.1:3001/health"
READINESS_URL="http://127.0.0.1:3001/readiness"
LOG_FILE="/app/logs/app.log"
PID_FILE="/tmp/app.pid"

if ! touch /app/logs/.wtest 2>/dev/null; then
    LOG_FILE="/tmp/app.log"
else
    rm -f /app/logs/.wtest
fi

log() {
    local line
    line="[$(date '+%Y-%m-%d %H:%M:%S')] [$APP_NAME] $1"
    echo "$line"
    echo "$line" >> "$LOG_FILE" 2>/dev/null || true
}

cleanup() {
    log "Received shutdown signal, cleaning up..."

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            log "Stopping application (PID: $PID)..."
            kill -TERM $PID

            for i in $(seq 1 30); do
                if ! kill -0 "$PID" 2>/dev/null; then
                    break
                fi
                sleep 1
            done

            if kill -0 "$PID" 2>/dev/null; then
                log "Force killing application (PID: $PID)..."
                kill -KILL $PID
            fi
        fi
        rm -f "$PID_FILE"
    fi

    log "Cleanup completed"
    exit 0
}

trap cleanup TERM INT

check_readiness() {
    if node -e "require('http').get('$READINESS_URL', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

start_application() {
    log "Starting application..."

    node dist/index.js 2>&1 | tee -a "$LOG_FILE" >/dev/null 2>&1 &
    PID=$!
        echo $PID > "$PID_FILE"

    log "Application started with PID: $PID"

    for i in $(seq 1 60); do
        if check_readiness; then
            log "Application is running and ready"
            return 0
        fi
        if ! kill -0 "$PID" 2>/dev/null; then
            log "Error: Application exited during startup"
            tail -20 "$LOG_FILE"
            exit 1
        fi
        sleep 1
    done

    log "Error: Application did not become ready within 60s"
    tail -20 "$LOG_FILE"
    exit 1
}

main() {
    log "Starting $APP_NAME container..."

    if [ "$1" = "health-check" ]; then
        if check_readiness; then
            exit 0
        else
            exit 1
        fi
    fi

    start_application

    log "Application is running. PID: $PID"

    while true; do
        if ! kill -0 "$PID" 2>/dev/null; then
            log "Application has stopped unexpectedly"
            exit 1
        fi
        sleep 5
    done
}

main "$@"

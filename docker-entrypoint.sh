#!/bin/sh

# Docker entrypoint script for wa-transfer
# This script handles proper startup, signal handling, and graceful shutdown

set -e

# Configuration
APP_NAME="wa-transfer"
HEALTH_CHECK_URL="http://localhost:3001/health"
READINESS_URL="http://localhost:3001/readiness"
LOG_FILE="/app/logs/app.log"
PID_FILE="/app/app.pid"

# Create logs directory
mkdir -p /app/logs

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$APP_NAME] $1" | tee -a "$LOG_FILE"
}

# Signal handler function
cleanup() {
    log "Received shutdown signal, cleaning up..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            log "Stopping application (PID: $PID)..."
            kill -TERM $PID
            
            # Wait for graceful shutdown
            for i in {1..30}; do
                if ! ps -p $PID > /dev/null 2>&1; then
                    break
                fi
                sleep 1
            done
            
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                log "Force killing application (PID: $PID)..."
                kill -KILL $PID
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    log "Cleanup completed"
    exit 0
}

# Register signal handlers
trap cleanup TERM INT

# Wait for dependencies to be ready
wait_for_dependencies() {
    log "Waiting for dependencies to be ready..."
    
    # Wait for health check to pass
    for i in {1..60}; do
        if curl -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log "Dependencies are ready"
            return 0
        fi
        log "Waiting for dependencies... ($i/60)"
        sleep 1
    done
    
    log "Error: Dependencies did not become ready"
    exit 1
}

# Check application readiness
check_readiness() {
    log "Checking application readiness..."
    
    if curl -f "$READINESS_URL" > /dev/null 2>&1; then
        log "Application is ready"
        return 0
    else
        log "Application is not ready"
        return 1
    fi
}

# Start the application
start_application() {
    log "Starting application..."
    
    # Start the application in background
    nohup node dist/index.js > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    log "Application started with PID: $PID"
    
    # Wait for application to be ready
    for i in {1..60}; do
        if check_readiness; then
            log "Application is running and ready"
            return 0
        fi
        log "Waiting for application to start... ($i/60)"
        sleep 1
    done
    
    log "Error: Application did not become ready"
    exit 1
}

# Main execution
main() {
    log "Starting $APP_NAME container..."
    
    # Check if we should run health checks
    if [ "$1" = "health-check" ]; then
        log "Running health check..."
        if check_readiness; then
            log "Health check passed"
            exit 0
        else
            log "Health check failed"
            exit 1
        fi
    fi
    
    # Wait for dependencies
    wait_for_dependencies
    
    # Start the application
    start_application
    
    log "Application is running. PID: $PID"
    
    # Keep the script running and monitor the application
    while true; do
        if ! ps -p $PID > /dev/null 2>&1; then
            log "Application has stopped unexpectedly"
            exit 1
        fi
        sleep 5
    done
}

# Run main function with arguments
main "$@"
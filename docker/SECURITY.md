# Docker Security Hardening Guide

## Security Best Practices Implemented

### 1. Multi-stage Build
- Separates build and production environments
- Reduces attack surface by excluding build dependencies
- Minimizes image size

### 2. Non-root User
- Creates dedicated `appuser` with limited privileges
- Runs application as non-root user
- Prevents privilege escalation attacks

### 3. Read-only Filesystem
- Container runs with read-only root filesystem
- Temporary data stored in tmpfs
- Persistent data in named volumes

### 4. Resource Limits
- Memory limits: 512MB max, 256MB reserved
- CPU limits: 0.5 cores max, 0.25 cores reserved
- Prevents resource exhaustion attacks

### 5. Security Profiles
- AppArmor profile enabled (wa-transfer-profile)
- No new privileges flag set
- Security options hardened

### 6. Network Security
- Isolated network namespace
- No unnecessary ports exposed
- Health check endpoint only

### 7. Secrets Management
- Environment variables for sensitive data
- Configuration files mounted read-only
- Secrets managed externally via .env files

### 8. Logging and Monitoring
- Structured logging with sensitive data redaction
- Health checks and readiness probes
- Operational monitoring capabilities

## Deployment Instructions

### 1. Environment Setup
```bash
# Copy configuration template
cp docker/config/.env.example .env

# Edit .env with your actual values
nano .env
```

### 2. Build and Deploy
```bash
# Build the image
docker build -t wa-transfer:latest .

# Or use Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f wa-transfer

# Health check
curl http://localhost:3001/health
```

### 3. Production Deployment
```bash
# Start with Docker Compose
docker-compose up -d

# Monitor health
docker-compose ps
docker-compose logs wa-transfer

# Scale if needed
docker-compose up -d --scale wa-transfer=2
```

### 4. Security Verification
```bash
# Check container security
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock docker security scan wa-transfer:latest

# Verify user permissions
docker exec wa-transfer id appuser

# Check filesystem permissions
docker exec wa-transfer ls -la /app
```

## Environment Variables

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `WHATSAPP_SESSION_ID`: WhatsApp session identifier

### Optional
- `LOG_LEVEL`: Logging level (debug|info|warn|error)
- `ENABLE_HEALTH_SERVER`: Enable health check server
- `HEALTH_SERVER_PORT`: Health check server port
- `MAX_CONCURRENT_REQUESTS`: Maximum concurrent requests

### Security Considerations
- Never commit .env files to version control
- Use secret management systems in production
- Rotate secrets regularly
- Monitor for unauthorized access

## Monitoring and Alerting

### Health Endpoints
- `/health`: Overall health status
- `/liveness`: Liveness probe
- `/readiness`: Readiness probe
- `/metrics`: System metrics

### Logging
- Structured JSON logging
- Sensitive data automatically redacted
- Log rotation configured
- Centralized logging support

### Security Monitoring
- Failed login attempts
- Unusual request patterns
- Resource usage spikes
- Dependency health

## Backup and Recovery

### Data Backup
```bash
# Backup data volumes
docker run --rm -v wa-transfer-data:/data -v $(pwd):/backup alpine tar czf /backup/backup-data.tar.gz -C /data .

# Restore data volumes
docker run --rm -v wa-transfer-data:/data -v $(pwd):/backup alpine tar xzf /backup/backup-data.tar.gz -C /data
```

### Configuration Backup
```bash
# Backup configuration
docker-compose config > backup-compose.yml

# Restore configuration
docker-compose -f backup-compose.yml up -d
```

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check user permissions in container
2. **Port Conflicts**: Ensure ports are available
3. **Memory Issues**: Adjust resource limits
4. **Health Check Failures**: Check application logs

### Debug Mode
```bash
# Run in debug mode
docker run --rm -it --entrypoint /bin/sh wa-transfer:latest

# Check logs
docker logs wa-transfer --tail 100

# Interactive debugging
docker exec -it wa-transfer /bin/sh
```

## Compliance

### Security Standards
- OWASP Top 10 compliance
- Docker Security Best Practices
- CIS Docker Benchmark
- NIST Cybersecurity Framework

### Data Protection
- GDPR compliant logging
- PII redaction
- Data encryption at rest
- Access controls

This security hardening ensures the wa-transfer application is production-ready with proper isolation, monitoring, and compliance measures.
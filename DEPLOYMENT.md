# Deployment Guide for wa-transfer

## 🚀 Complete Build & Deployment Process

### Prerequisites

1. **Node.js**: v18+ 
2. **npm**: v8+
3. **Supabase Account**: For database and authentication
4. **Social Media API Tokens**: For publishing (optional)
5. **Oracle Cloud Account**: For VM hosting (optional)

### Step 1: Setup Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd wa-transfer

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

### Step 2: Configure Supabase

1. **Create Supabase Project**
   ```bash
   # Using Supabase CLI
   supabase login
   supabase new
   supabase link
   ```

2. **Run Database Migrations**
   ```bash
   # Create tables
   supabase db push
   ```

3. **Configure Environment Variables**
   ```bash
   # Get your Supabase URL and keys
   supabase status
   ```

### Step 3: Build the Application

```bash
# Clean previous builds
rm -rf dist/

# Build TypeScript
npm run build

# Run type checking
npm run typecheck

# Run tests
npm test
```

### Step 4: Configure Social Media APIs (Optional)

#### Instagram
1. Create Facebook Developer Account
2. Create Instagram Basic Display API
3. Get access token and account ID

#### Facebook
1. Create Facebook App
2. Get Page Access Token
3. Configure Graph API

#### Twitter
1. Create Twitter Developer Account
2. Get API Keys and Tokens
3. Configure API v2

#### LinkedIn
1. Create LinkedIn Developer Account
2. Get API Credentials
3. Configure OAuth 2.0

### Step 5: Configure Environment Variables

```bash
# Edit .env file with your actual values
nano .env
```

Required variables:
```env
# Supabase (Required)
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# WhatsApp (Required)
WHATSAPP_SESSION_ID=default
WHATSAPP_RETRY_DELAY_MS=5000
WHATSAPP_MAX_RETRIES=3

# Monitoring (Required)
MONITORING_GROUPS=group1@example.com,group2@example.com
MAX_MESSAGES_PER_GROUP=100
MESSAGE_PROCESSING_INTERVAL_MS=30000
```

Optional variables for social media:
```env
# Instagram
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_ACCOUNT_ID=your_account_id

# Facebook
FACEBOOK_ACCESS_TOKEN=your_token
FACEBOOK_PAGE_ID=your_page_id

# Twitter
TWITTER_BEARER_TOKEN=your_token

# LinkedIn
LINKEDIN_ACCESS_TOKEN=your_token
```

### Step 6: Test the Application

```bash
# Run in development mode
npm run dev

# Test CLI commands
node dist/social-media-cli.js help
node dist/social-media-cli.js analytics
node dist/social-media-cli.js queue create

# Run system tests
npm test
```

### Step 7: Deploy to Production

#### Option A: Local Production
```bash
# Build for production
npm run build

# Start the application
npm start
```

#### Option B: Docker Deployment
```bash
# Build Docker image
docker build -t wa-transfer .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option C: Oracle Cloud VM
```bash
# Deploy to Oracle Cloud
./deploy-oracle.sh

# Access the application
ssh ubuntu@your_vm_ip
cd wa-transfer
npm start
```

### Step 8: Configure Monitoring

1. **Health Checks**
   ```bash
   # Set up monitoring
   npm install --save-dev nodemon
   
   # Create monitoring script
   nano monitor.sh
   ```

2. **Logging**
   ```bash
   # Configure logging
   npm install winston
   ```

3. **Alerts**
   ```bash
   # Set up error alerts
   npm install --save @slack/webhook
   ```

### Step 9: Set up CI/CD (Optional)

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy wa-transfer
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy
        run: npm start
```

### Step 10: Production Checklist

- [ ] Environment variables are set
- [ ] Database migrations are run
- [ ] SSL certificates are configured
- [ ] Firewall rules are set
- [ ] Monitoring is enabled
- [ ] Backups are configured
- [ ] DNS is pointing to the server
- [ ] Load balancing is configured (if needed)

### Troubleshooting

#### Common Issues

1. **Supabase Connection Error**
   ```bash
   # Check environment variables
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   
   # Test connection
   npm test
   ```

2. **WhatsApp Connection Issues**
   ```bash
   # Check session file
   ls -la creds/
   
   # Regenerate session
   node get-session.js
   ```

3. **Social Media API Errors**
   ```bash
   # Test API tokens
   node dist/social-media-cli.js analytics facebook
   
   # Check API status
   curl -X GET "https://graph.facebook.com/v18.0/me?access_token=YOUR_TOKEN"
   ```

### Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs: `docker-compose logs` or `journalctl -u wa-transfer`
3. Open an issue on GitHub
4. Contact the development team

### Next Steps

1. **Customize**: Modify the configuration for your specific use case
2. **Integrate**: Connect to your existing systems
3. **Scale**: Set up load balancing for high traffic
4. **Monitor**: Implement advanced monitoring and alerting
5. **Optimize**: Fine-tune performance based on your needs

---

🎉 **Congratulations! Your wa-transfer system is now ready to use!**
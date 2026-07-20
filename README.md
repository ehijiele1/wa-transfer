# wa-transfer - WhatsApp Business Intelligence & Social Media Automation

## 📱 Overview

wa-transfer is a comprehensive system that monitors WhatsApp groups for real estate listings and promotional offers, extracts information, generates Instagram carousel marketing content, and publishes to multiple social media platforms. Built with TypeScript, Node.js, and Supabase.

## 🚀 Features

### Core Functionality
- **WhatsApp Monitoring**: Monitor 5+ WhatsApp groups for real estate content
- **Message Classification**: AI-powered categorization of messages (listings, promotions, etc.)
- **Content Extraction**: Extract property details, prices, images, and contact info
- **Instagram Integration**: Generate engaging carousel posts with AI
- **Multi-Platform Publishing**: Publish to Facebook, Twitter, and LinkedIn
- **A/B Testing**: Test different content variations for optimization
- **Analytics Dashboard**: Track performance and engagement metrics
- **Queue Management**: Schedule and batch content publishing

### Technical Stack
- **Frontend**: TypeScript, Node.js
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: Ollama (local LLM)
- **WhatsApp**: Baileys library
- **Social Media**: Platform-specific APIs
- **Deployment**: Docker, Oracle Cloud

## 📋 Prerequisites

- Node.js v18+
- npm v8+
- Supabase account
- Social media API tokens (optional)
- Oracle Cloud account (optional)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd wa-transfer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

### 4. Build the Application
```bash
npm run build
```

## 🔧 Configuration

### Required Configuration
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

### Optional Configuration
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

## 🚀 Usage

### Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### CLI Commands

#### Social Media Management
```bash
# Get help
node dist/social-media-cli.js help

# Publish to platform
node dist/social-media-cli.js publish facebook
node dist/social-media-cli.js publish twitter
node dist/social-media-cli.js publish linkedin

# Schedule content
node dist/social-media-cli.js schedule facebook "2024-01-15 10:00:00"

# Get analytics
node dist/social-media-cli.js analytics facebook
node dist/social-media-cli.js analytics

# Get dashboard
node dist/social-media-cli.js dashboard

# Manage queues
node dist/social-media-cli.js queue create facebook
node dist/social-media-cli.js queue status
node dist/social-media-cli.js queue pause
node dist/social-media-cli.js queue resume

# Cross-platform publishing
node dist/social-media-cli.js cross-platform "facebook,twitter,linkedin"
```

#### A/B Testing
```bash
# Create A/B test
node dist/social-media-cli.js ab-test create

# Start/stop tests
node dist/social-media-cli.js ab-test start <testId>
node dist/social-media-cli.js ab-test stop <testId>

# Get results
node dist/social-media-cli.js ab-test results <testId>
node dist/social-media-cli.js ab-test recommendations <testId>
```

#### Instagram Management
```bash
# Generate carousel
node dist/instagram-cli.js generate <propertyId>

# Publish carousel
node dist/instagram-cli.js publish <carouselId>

# Get analytics
node dist/instagram-cli.js analytics

# Batch publish
node dist/instagram-cli.js batch-publish

# List carousels
node dist/instagram-cli.js list
```

## 📊 Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Supabase     │    │   Instagram     │
│   Monitoring    │───▶│   Database     │───▶│   Integration   │
│   Service       │    │                │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Message         │    │   Content       │    │   Social Media  │
│ Processor       │    │   Queue         │    │   Manager       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────┐
                    │   A/B Testing    │
                    │   Framework      │
                    └─────────────────┘
```

### Data Flow
1. **WhatsApp Groups**: Real estate messages are collected
2. **Message Processing**: AI classifies and extracts information
3. **Database Storage**: Structured data stored in Supabase
4. **Content Generation**: AI creates Instagram carousels
5. **Queue Management**: Content scheduled for publishing
6. **Multi-Platform**: Published to social media channels
7. **Analytics**: Performance metrics tracked and analyzed

## 🧪 Testing

### Run Tests
```bash
# System tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Test Coverage
- Configuration validation
- Database connectivity
- App initialization
- CLI functionality
- Social media integration

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t wa-transfer .

# Run with compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Oracle Cloud VM
```bash
# Deploy script
./deploy-oracle.sh

# Access VM
ssh ubuntu@your_vm_ip
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Firewall rules set
- [ ] Monitoring enabled
- [ ] Backups configured

## 📈 Monitoring

### Health Checks
```bash
# Application health
curl http://localhost:3000/health

# Database connectivity
npm test
```

### Logging
```bash
# Application logs
docker-compose logs -f wa-transfer

# System logs
journalctl -u wa-transfer -f
```

### Metrics
- Message processing rate
- Content generation success rate
- Social media publishing success rate
- Engagement metrics
- Error rates

## 🔧 Troubleshooting

### Common Issues

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

### Debug Mode
```bash
# Enable debug logging
DEBUG=wa-transfer:* npm start

# Verbose output
node dist/index.js --verbose
```

## 🤝 Contributing

### Development Setup
```bash
# Install development dependencies
npm install --save-dev

# Run development server
npm run dev

# Run tests on changes
npm run test:watch
```

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Write comprehensive tests
- Document public APIs

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Run tests
6. Submit pull request

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs
3. Open an issue on GitHub
4. Contact the development team

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](docs/api.md)
- [Configuration Guide](docs/configuration.md)
- [Troubleshooting Guide](docs/troubleshooting.md)

## 🎯 Roadmap

### Phase 1 (Complete)
- WhatsApp monitoring
- Message classification
- Instagram integration
- Multi-platform publishing
- A/B testing
- Analytics

### Phase 2 (Planned)
- Notion integration
- Advanced AI features
- Mobile app
- Advanced analytics
- Performance optimization

### Phase 3 (Future)
- Real-time notifications
- Advanced targeting
- Integration with CRM
- Advanced reporting
- Machine learning improvements

---

🎉 **Thank you for using wa-transfer!**
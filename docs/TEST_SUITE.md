# Test Suite Documentation

## Overview

This project includes a comprehensive test suite with unit tests, integration tests, and smoke tests to ensure the reliability and correctness of the wa-transfer application.

## Test Structure

```
wa-transfer/
├── test/
│   ├── setup.ts                 # Test setup and mocking
│   ├── services/                # Unit tests for services
│   │   ├── idempotencyService.test.ts
│   │   ├── inputGuard.test.ts
│   │   ├── urlGuard.test.ts
│   │   └── ...
│   ├── integration/             # Integration tests
│   │   ├── jobs.test.ts
│   │   ├── health.test.ts
│   │   └── ...
│   └── unit/                    # Unit tests (if needed)
├── scripts/
│   ├── test-runner.js           # Comprehensive test runner
│   └── smoke.ts                 # Smoke test script
├── jest.config.js               # Jest configuration
└── .eslintrc.json               # ESLint configuration
```

## Test Types

### 1. Unit Tests
- **Purpose**: Test individual components in isolation
- **Location**: `test/services/`
- **Coverage**: Core services like idempotency, input validation, URL guards
- **Framework**: Jest with TypeScript

### 2. Integration Tests
- **Purpose**: Test interactions between components
- **Location**: `test/integration/`
- **Coverage**: Job scheduling, health monitoring, system integration
- **Framework**: Jest with mocking of external dependencies

### 3. Smoke Tests
- **Purpose**: Basic validation of the application
- **Location**: `scripts/smoke.ts`
- **Coverage**: TypeScript compilation, module loading, basic functionality
- **Framework**: Custom Node.js script

## Test Commands

### Quick Tests
```bash
# Run quick tests (unit + smoke)
npm run test:quick

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only smoke tests
npm run smoke
```

### Comprehensive Tests
```bash
# Run all tests with coverage
npm run test:all

# Run comprehensive test suite (CI mode)
npm run test:ci

# Run tests with coverage report
npm run test:coverage
```

### Development
```bash
# Run tests in watch mode
npm run test:watch

# Run tests and watch for changes
npm run test:watch -- --watchAll
```

### Code Quality
```bash
# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Run type checking
npm run typecheck

# Run validation (typecheck + lint + quick tests)
npm run validate
```

## Test Runner

The comprehensive test runner (`scripts/test-runner.js`) provides:

- **Prerequisite checking**: Ensures dependencies are installed and project is built
- **Test execution**: Runs different types of tests with appropriate timeouts
- **Coverage reporting**: Generates coverage reports and checks thresholds
- **Result aggregation**: Collects results from all test types
- **Report generation**: Creates JSON test reports
- **Cleanup**: Removes temporary files and coverage directories

### Usage Examples

```bash
# Run all tests
node scripts/test-runner.js all

# Run specific test types
node scripts/test-runner.js unit integration

# Run with coverage
node scripts/test-runner.js coverage

# Run CI mode (all tests with quality checks)
node scripts/test-runner.js ci
```

## Test Configuration

### Jest Configuration
- **Test Environment**: Node.js
- **Pattern Matching**: TypeScript files in test directories
- **Coverage Collection**: Source files excluding types and main entry
- **Timeout**: 30 seconds for unit tests, 60 seconds for integration tests

### ESLint Configuration
- **Parser**: TypeScript ESLint parser
- **Rules**: TypeScript-specific rules and best practices
- **Ignored Patterns**: Build directories, node_modules, coverage
- **File-specific overrides**: Different rules for test files and scripts

### Test Environment Variables
```bash
NODE_ENV=test                    # Test environment
LOG_LEVEL=error                  # Reduce log noise during tests
SUPABASE_URL=test-url            # Test database URL
SUPABASE_ANON_KEY=test-key       # Test anon key
```

## Mocking Strategy

### External Dependencies
- **Supabase**: Mocked to return test data
- **WhatsApp Web**: Mocked client with basic functionality
- **Puppeteer**: Mocked browser with page methods
- **Social Media APIs**: Mocked API clients
- **HTTP Clients**: Mocked axios instances

### Custom Mocks
- **File System**: Mock file operations for testing
- **Environment Variables**: Controlled test environment
- **Timers**: Fake timers for testing async operations
- **Console**: Mocked to reduce test noise

## Writing Tests

### Unit Test Example
```typescript
describe('IdempotencyService', () => {
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    idempotencyService = new IdempotencyService();
  });

  afterEach(() => {
    idempotencyService.shutdown();
  });

  it('should execute operation successfully on first call', async () => {
    const operationFn = jest.fn().mockResolvedValue('success');
    
    const result = await idempotencyService.executeWithIdempotency(
      'test-operation', 
      { test: 'data' }, 
      operationFn
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
  });
});
```

### Integration Test Example
```typescript
describe('JobScheduler Integration', () => {
  let jobScheduler: JobScheduler;

  beforeEach(() => {
    jobScheduler = new JobScheduler();
  });

  afterEach(async () => {
    await jobScheduler.stop();
  });

  it('should execute message processing job', async () => {
    jobScheduler.registerJob('message', MessageProcessingJob);
    
    const jobData = {
      id: 'msg123',
      from: '1234567890@c.us',
      message: 'Test message'
    };

    const result = await jobScheduler.executeJob('message', jobData);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Coverage Requirements

- **Minimum Coverage**: 80% total coverage
- **Critical Modules**: 90% coverage for core services
- **Integration Tests**: Full coverage of critical paths
- **Coverage Reports**: Generated in `coverage/` directory

## Test Data

### Test Messages
```typescript
const validMessage = {
  id: 'msg123',
  from: '1234567890@c.us',
  to: '9876543210@c.us',
  message: 'Hello, I\'m interested in property 123',
  timestamp: Date.now(),
  type: 'chat'
};
```

### Test Properties
```typescript
const validProperty = {
  id: 'prop123',
  address: '123 Main St',
  price: 250000,
  bedrooms: 3,
  bathrooms: 2,
  type: 'house'
};
```

## Continuous Integration

### CI Pipeline
1. **Prerequisites**: Install dependencies and build project
2. **Code Quality**: Run linting and type checking
3. **Unit Tests**: Run unit tests with coverage
4. **Integration Tests**: Run integration tests
5. **Smoke Tests**: Run smoke tests
6. **Report Generation**: Generate coverage and test reports

### CI Commands
```bash
# Full CI pipeline
npm run validate:ci

# Quick CI validation
npm run validate
```

## Troubleshooting

### Common Issues

1. **Test Failures**:
   - Check mock configurations
   - Verify environment variables
   - Review test data

2. **Coverage Issues**:
   - Add missing test cases
   - Configure ignore patterns
   - Check coverage thresholds

3. **Timeout Issues**:
   - Increase test timeouts
   - Optimize test performance
   - Check for blocking operations

### Debug Mode
```bash
# Run tests with verbose output
npm run test:unit -- --verbose

# Run tests with coverage
npm run test:coverage -- --coverage-reporters=text

# Run specific test with debugging
node --inspect-brk node_modules/jest/bin/jest --testNamePattern="should execute operation"
```

## Best Practices

1. **Test Organization**:
   - Group related tests in describe blocks
   - Use meaningful test names
   - Keep tests focused and independent

2. **Mocking**:
   - Mock external dependencies
   - Use jest.mock() for global mocks
   - Reset mocks between tests

3. **Assertions**:
   - Use specific assertions
   - Include error cases
   - Test both success and failure scenarios

4. **Performance**:
   - Use beforeEach/afterEach for setup/teardown
   - Avoid expensive operations in tests
   - Use appropriate timeouts

## Contributing

When adding new tests:

1. **Choose appropriate test type** (unit vs integration)
2. **Follow existing patterns** and naming conventions
3. **Add both positive and negative test cases**
4. **Update coverage** for new functionality
5. **Ensure tests pass** in CI pipeline

## References

- [Jest Documentation](https://jestjs.io/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-6-testing-and-overall-quality-practices)
// Test setup file
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock external dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      gte: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      single: jest.fn()
    })),
    auth: {
      getUser: jest.fn()
    }
  }))
}));

// Mock whatsapp-web.js
jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    logout: jest.fn()
  })),
  MessageMedia: jest.fn(),
  LocalAuth: jest.fn()
}));

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => Promise.resolve({
    newPage: jest.fn(() => Promise.resolve({
      goto: jest.fn(),
      evaluate: jest.fn(),
      screenshot: jest.fn(),
      close: jest.fn()
    })),
    close: jest.fn()
  }))
}));

// Mock cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn()
  }))
}));

// Mock axios
jest.mock('axios', () => ({
  default: jest.fn(() => Promise.resolve({
    data: {},
    status: 200,
    statusText: 'OK'
  }))
}));

// Mock social media APIs
jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn().mockImplementation(() => ({
    v2: {
      post: jest.fn()
    }
  }))
}));

jest.mock('instagram-graph-api', () => ({
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn()
  }))
}));

// Global test utilities
global.beforeEach(() => {
  jest.clearAllMocks();
});

global.afterEach(() => {
  jest.clearAllMocks();
});

// Mock console.error to reduce noise during tests
const originalError = console.error;
console.error = jest.fn((...args) => {
  // Only log actual errors, not jest mock calls
  if (!args.some(arg => typeof arg === 'string' && arg.includes('jest'))) {
    originalError(...args);
  }
});
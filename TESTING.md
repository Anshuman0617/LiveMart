# Testing Guide

This project uses different testing frameworks for the client and server. **All test files are kept separate in `__tests__` directories** next to the code they test.

## 📁 Test File Locations

### Client Tests (React Components & Utilities)
```
client/src/
├── components/
│   └── __tests__/
│       └── Navbar.test.jsx          ← Component tests
├── __tests__/
│   └── api.test.js                  ← Utility function tests
└── test/
    └── setup.js                     ← Test configuration
```

### Server Tests (API Routes & Utilities)
```
server/
├── routes/
│   └── __tests__/
│       └── users.test.js            ← API route tests
└── utils/
    └── __tests__/
        └── distance.test.js         ← Utility function tests
```

## Client Testing (Vitest + React Testing Library)

The client uses **Vitest** with **React Testing Library** for component and utility testing.

### Setup

1. Install dependencies:
```bash
cd client
npm install
```

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test File Locations

All client tests are in `__tests__` directories:

- **Component tests**: `client/src/components/__tests__/Navbar.test.jsx`
- **Utility tests**: `client/src/__tests__/api.test.js`
- **Test setup**: `client/src/test/setup.js`

**Pattern**: Create a `__tests__` folder next to the file you want to test, then add `YourFile.test.jsx` inside it.

### Writing Tests

Example test structure:
```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Server Testing (Vitest + Supertest)

The server uses **Vitest** with **Supertest** for API route testing.

### Setup

1. Install dependencies:
```bash
cd server
npm install
```

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test File Locations

All server tests are in `__tests__` directories:

- **Route tests**: `server/routes/__tests__/users.test.js`
- **Utility tests**: `server/utils/__tests__/distance.test.js`

**Pattern**: Create a `__tests__` folder next to the file you want to test, then add `YourFile.test.js` inside it.

### Writing Tests

Example test structure:
```javascript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('MyRoute', () => {
  it('handles GET request', async () => {
    const app = express();
    // ... setup routes
    const response = await request(app)
      .get('/my-route');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

## Test Coverage

Both frameworks support coverage reports:

- **Client**: `npm run test:coverage` (uses Vitest's built-in coverage)
- **Server**: `npm run test:coverage` (uses Vitest's coverage)

## Best Practices

1. **Test behavior, not implementation**: Focus on what the component/function does, not how it does it
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **Keep tests isolated**: Each test should be independent and not rely on other tests
4. **Mock external dependencies**: Use mocks for API calls, localStorage, etc.
5. **Test edge cases**: Don't just test the happy path - test error cases and edge conditions

## 📋 Quick Reference

### Running Tests

**Client:**
```bash
cd client
npm install          # First time only
npm test            # Run all tests
npm run test:ui     # Interactive UI
npm run test:coverage  # With coverage report
```

**Server:**
```bash
cd server
npm install          # First time only
npm test            # Run all tests
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage report
```

### Current Test Files

✅ **Client:**
- `client/src/components/__tests__/Navbar.test.jsx` - Tests Navbar component (rendering, user interactions, logout)
- `client/src/__tests__/api.test.js` - Tests API utility functions (token handling, headers)

✅ **Server:**
- `server/routes/__tests__/users.test.js` - Tests user API routes (GET /me, PUT /me, GET /:id)
- `server/utils/__tests__/distance.test.js` - Tests distance calculation utility

### Adding New Tests

1. **For a new component**: Create `client/src/components/__tests__/YourComponent.test.jsx`
2. **For a new utility**: Create `client/src/__tests__/yourUtility.test.js`
3. **For a new route**: Create `server/routes/__tests__/yourRoute.test.js`
4. **For a new server utility**: Create `server/utils/__tests__/yourUtility.test.js`

The test files are **completely separate** from your source code - they live in their own `__tests__` directories!


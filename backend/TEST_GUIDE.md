# Testing Guide

## Overview

This project uses Jest as the testing framework for both unit and integration tests. This guide covers how to write and run tests effectively.

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### With Coverage

```bash
npm run test:coverage
```

### Verbose Output

```bash
npm run test:verbose
```

### Specific Test File

```bash
npm test -- path/to/test.test.js
```

### Tests Matching Pattern

```bash
npm test -- --testNamePattern="should validate"
```

## Test Organization

Tests are colocated with the code they test in `__tests__` directories:

```
src/
├── models/
│   ├── User.js
│   └── __tests__/
│       └── User.test.js
├── middleware/
│   ├── auth.js
│   └── __tests__/
│       └── auth.test.js
├── routes/
│   ├── leads.js
│   └── __tests__/
│       └── leads.test.js
└── utils/
    ├── validateEnv.js
    └── __tests__/
        └── validateEnv.test.js
```

## Writing Tests

### Unit Tests

Test individual functions or modules in isolation:

```javascript
// src/utils/__tests__/formatters.test.js
const { formatCurrency, formatDate } = require('../formatters');

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
    });
  });
});
```

### Integration Tests

Test multiple components working together:

```javascript
// src/routes/__tests__/leads.test.js
const request = require('supertest');
const app = require('../../server');
const Lead = require('../../models/Lead');

describe('Leads API', () => {
  beforeEach(async () => {
    await Lead.deleteMany({});
  });

  describe('POST /api/leads', () => {
    it('should create a new lead', async () => {
      const leadData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe(leadData.email);
    });
  });
});
```

### Async Tests

Test asynchronous code properly:

```javascript
describe('Database Operations', () => {
  it('should save user to database', async () => {
    const user = new User({ email: 'test@example.com' });
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
  });

  it('should handle errors', async () => {
    const user = new User({ email: 'invalid' }); // Invalid email

    await expect(user.save()).rejects.toThrow();
  });
});
```

## Mocking

### Mocking Functions

```javascript
const sendEmail = jest.fn();

test('should send welcome email', () => {
  sendEmail('user@example.com', 'Welcome!');

  expect(sendEmail).toHaveBeenCalledWith('user@example.com', 'Welcome!');
  expect(sendEmail).toHaveBeenCalledTimes(1);
});
```

### Mocking Modules

```javascript
jest.mock('../utils/email');
const { sendEmail } = require('../utils/email');

describe('User Registration', () => {
  it('should send welcome email on registration', async () => {
    sendEmail.mockResolvedValue(true);

    await registerUser({ email: 'test@example.com' });

    expect(sendEmail).toHaveBeenCalled();
  });
});
```

### Mocking HTTP Requests

```javascript
const axios = require('axios');
jest.mock('axios');

test('should fetch user data', async () => {
  const userData = { id: 1, name: 'John' };
  axios.get.mockResolvedValue({ data: userData });

  const result = await fetchUser(1);

  expect(result).toEqual(userData);
  expect(axios.get).toHaveBeenCalledWith('/api/users/1');
});
```

## Test Fixtures

Create reusable test data:

```javascript
// __tests__/fixtures/users.js
const createUserData = (overrides = {}) => ({
  email: 'test@example.com',
  password: 'password123',
  companyName: 'Test Corp',
  ...overrides,
});

const createSavedUser = async (overrides = {}) => {
  const user = new User(createUserData(overrides));
  return await user.save();
};

module.exports = { createUserData, createSavedUser };
```

Usage:

```javascript
const { createSavedUser } = require('../fixtures/users');

test('should find user by email', async () => {
  const user = await createSavedUser({ email: 'unique@example.com' });
  const found = await User.findOne({ email: 'unique@example.com' });

  expect(found._id).toEqual(user._id);
});
```

## Database Testing

### Setup and Teardown

```javascript
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});
```

## Coverage Goals

Aim for these coverage thresholds:

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

Current thresholds (defined in jest.config.js):

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
},
```

## Best Practices

### 1. Descriptive Test Names

```javascript
// Good
it('should return 404 when lead is not found', () => {});

// Bad
it('test lead', () => {});
```

### 2. Arrange-Act-Assert Pattern

```javascript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### 3. One Assertion Per Test (when possible)

```javascript
// Good
it('should set firstName correctly', () => {
  expect(user.firstName).toBe('John');
});

it('should set lastName correctly', () => {
  expect(user.lastName).toBe('Doe');
});

// Acceptable for related assertions
it('should set full name correctly', () => {
  expect(user.firstName).toBe('John');
  expect(user.lastName).toBe('Doe');
  expect(user.fullName).toBe('John Doe');
});
```

### 4. Test Edge Cases

```javascript
describe('divideNumbers', () => {
  it('should divide positive numbers', () => {
    expect(divideNumbers(10, 2)).toBe(5);
  });

  it('should handle division by zero', () => {
    expect(() => divideNumbers(10, 0)).toThrow('Division by zero');
  });

  it('should handle negative numbers', () => {
    expect(divideNumbers(-10, 2)).toBe(-5);
  });

  it('should handle decimals', () => {
    expect(divideNumbers(10, 3)).toBeCloseTo(3.33, 2);
  });
});
```

### 5. Avoid Test Interdependence

```javascript
// Bad: Tests depend on execution order
let user;

it('should create user', () => {
  user = createUser();
  expect(user).toBeDefined();
});

it('should update user', () => {
  updateUser(user); // Depends on previous test
  expect(user.updated).toBe(true);
});

// Good: Tests are independent
it('should create user', () => {
  const user = createUser();
  expect(user).toBeDefined();
});

it('should update user', () => {
  const user = createUser();
  updateUser(user);
  expect(user.updated).toBe(true);
});
```

## Continuous Integration

Tests run automatically on:

- Every push to feature branches
- Every pull request
- Before deployment to staging/production

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
- name: Run tests
  run: npm test
  env:
    NODE_ENV: test

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
```

## Debugging Tests

### Run in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

### Focus on Specific Test

```javascript
// Run only this test
it.only('should pass', () => {
  expect(true).toBe(true);
});

// Skip this test
it.skip('should be skipped', () => {
  expect(false).toBe(true);
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

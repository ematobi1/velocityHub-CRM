# Contributing to VelocityHub CRM

Thank you for your interest in contributing to VelocityHub CRM! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

### Expected Behavior

- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community and project
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- MongoDB 7.x
- Redis 7.x
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/velocityHub-CRM.git
   cd velocityHub-CRM
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/ematobi1/velocityHub-CRM.git
   ```

## Development Setup

### Option 1: Docker (Recommended)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# The application will be available at:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
# - MongoDB: localhost:27017
# - Redis: localhost:6379
```

### Option 2: Local Installation

1. **Install dependencies:**
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env

   # Edit backend/.env with your configuration
   ```

3. **Start MongoDB and Redis:**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

4. **Run the application:**
   ```bash
   # From root directory
   npm run dev

   # Or run separately:
   # Backend: cd backend && npm run dev
   # Frontend: cd frontend && npm start
   ```

### Setting Up Pre-commit Hooks

Pre-commit hooks are automatically installed when you run `npm install` in the root directory. They will:
- Lint your code with ESLint
- Format code with Prettier
- Run before each commit

To skip hooks (not recommended):
```bash
git commit --no-verify
```

## Development Workflow

### Creating a Branch

1. Ensure your local main branch is up to date:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. Create a new branch from main:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/lead-scoring`)
- `fix/` - Bug fixes (e.g., `fix/login-validation`)
- `docs/` - Documentation changes (e.g., `docs/api-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-middleware`)
- `test/` - Adding tests (e.g., `test/user-model`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

## Coding Standards

### JavaScript Style Guide

We use ESLint and Prettier to enforce code style. Configuration is already set up.

**Key conventions:**
- Use ES6+ syntax
- Use `const` and `let`, never `var`
- Use arrow functions for callbacks
- Use async/await instead of promises when possible
- Use template literals for string concatenation
- No console.log in production code (use `logger` instead)

### Backend Guidelines

```javascript
// Good
const getUserById = async (id) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    logger.error('Error fetching user:', error);
    throw error;
  }
};

// Bad
function getUserById(id) {
  return User.findById(id).then(user => {
    if (!user) throw new Error('User not found');
    return user;
  }).catch(err => {
    console.log(err);  // Don't use console.log
    throw err;
  });
}
```

### Frontend Guidelines

```javascript
// Good - Functional component with hooks
import { useState, useEffect } from 'react';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId);
  }, [userId]);

  const fetchUser = async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
};
```

### File Organization

**Backend:**
```
backend/src/
├── models/          # Mongoose models
├── routes/          # Express routes
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── services/        # Business logic
├── utils/           # Utility functions
└── server.js        # Entry point
```

**Frontend:**
```
frontend/src/
├── components/      # Reusable components
├── pages/          # Page components
├── contexts/       # React contexts
├── utils/          # Utility functions
└── App.js          # Main app component
```

## Testing Guidelines

### Writing Tests

We use Jest for both backend and frontend testing.

**Backend test example:**
```javascript
// backend/src/models/__tests__/User.test.js
describe('User Model', () => {
  it('should hash password before saving', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
    });
    await user.save();
    expect(user.password).not.toBe('password123');
  });
});
```

**Frontend test example:**
```javascript
// frontend/src/components/__tests__/Button.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button Component', () => {
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend

# Run tests with coverage
cd backend && npm test -- --coverage
cd frontend && npm test -- --coverage --watchAll=false
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(auth): add JWT token refresh functionality

Implements automatic JWT token refresh to improve user experience.
Tokens are now refreshed 5 minutes before expiration.

Closes #123
```

```bash
fix(leads): correct lead scoring calculation

The scoring algorithm was not properly weighing engagement metrics.
This fix adjusts the weights to match the specification.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. **Update your branch:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Run linting:**
   ```bash
   npm run lint
   ```

4. **Check formatting:**
   ```bash
   npm run format:check
   ```

### Creating a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin your-branch
   ```

2. Go to the repository on GitHub and click "New Pull Request"

3. Fill out the PR template with:
   - Clear description of changes
   - Related issue numbers
   - Screenshots (if UI changes)
   - Testing performed

4. Ensure all CI checks pass

### PR Title Format

Follow the same format as commit messages:
```
feat(leads): add bulk import functionality
fix(dashboard): correct chart rendering issue
```

### Review Process

- At least one maintainer approval is required
- All CI checks must pass
- All comments must be resolved
- Code must follow style guidelines
- Tests must be included for new features

## Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported in [Issues](https://github.com/ematobi1/velocityHub-CRM/issues)
2. Try to reproduce the bug on the latest version
3. Gather as much information as possible

### Bug Report Template

```markdown
**Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., macOS 13.0]
- Node.js version: [e.g., 18.17.0]
- Browser: [e.g., Chrome 119]

**Screenshots**
If applicable, add screenshots.

**Additional Context**
Any other relevant information.
```

## Feature Requests

We welcome feature requests! Please:

1. Check if the feature has already been requested
2. Clearly describe the feature and its benefits
3. Provide use cases
4. Consider implementation complexity

### Feature Request Template

```markdown
**Feature Description**
Clear description of the proposed feature.

**Problem It Solves**
What problem does this feature solve?

**Proposed Solution**
How do you envision this working?

**Alternatives Considered**
What other solutions have you considered?

**Additional Context**
Any other relevant information.
```

## Questions?

If you have questions about contributing:

1. Check the [documentation](./Documentation%20files/)
2. Search existing [issues](https://github.com/ematobi1/velocityHub-CRM/issues)
3. Open a new issue with the `question` label

## License

By contributing to VelocityHub CRM, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to VelocityHub CRM! 🚀

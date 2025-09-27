# Contributing to Gemini Realtime Monorepo

Thank you for your interest in contributing to the Gemini Realtime Monorepo! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and constructive in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ and pnpm installed
- Python 3.11+ installed
- Git configured with your GitHub account
- A code editor (VS Code recommended)

### First-time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/gemini-realtime-monorepo.git
   cd gemini-realtime-monorepo
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/gemini-realtime-monorepo.git
   ```

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

5. **Set up environment variables**:
   ```bash
   # Web App
   cp apps/web-app/.env.example apps/web-app/.env.local
   
   # Backend
   cp apps/gemini-multimodal-playground/backend/.env.example apps/gemini-multimodal-playground/backend/.env
   ```

6. **Configure your environment files** with development API keys

## Development Setup

### Running the Development Environment

```bash
# Start all applications
pnpm dev

# Or start individually
cd apps/web-app && pnpm dev              # Frontend on :3000
cd apps/gemini-multimodal-playground/backend && python main.py  # Backend on :8000
```

### Development Tools

- **Frontend**: Next.js with hot reload
- **Backend**: FastAPI with auto-reload
- **Database**: PostgreSQL (local or cloud)
- **Linting**: ESLint for TypeScript, Black for Python
- **Testing**: Vitest for frontend, Pytest for backend

## Project Structure

```
gemini-realtime-monorepo/
├── apps/
│   ├── web-app/                    # Next.js SaaS Frontend
│   └── gemini-multimodal-playground/
│       ├── backend/                # Python FastAPI Backend
│       ├── frontend/               # Standalone Frontend
│       └── standalone/             # CLI Tools
├── packages/                       # Shared packages
├── docs/                          # Documentation
├── scripts/                       # Build and deployment scripts
└── .github/                       # GitHub workflows and templates
```

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Fix issues and improve stability
- **Features**: Add new functionality
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize performance
- **Refactoring**: Improve code quality

### Before You Start

1. **Check existing issues** to see if your contribution is already being worked on
2. **Create an issue** for new features or significant changes to discuss the approach
3. **Start small** with your first contribution to get familiar with the codebase

### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

Examples:
- `feature/add-voice-commands`
- `fix/websocket-connection-issue`
- `docs/update-deployment-guide`

## Pull Request Process

### Creating a Pull Request

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   # Frontend tests
   cd apps/web-app && pnpm test
   
   # Backend tests
   cd apps/gemini-multimodal-playground/backend && python -m pytest
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add voice command functionality"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a pull request** on GitHub

### Pull Request Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Explain what changes you made and why
- **Link issues**: Reference related issues using `Fixes #123` or `Closes #123`
- **Screenshots**: Include screenshots for UI changes
- **Testing**: Describe how you tested your changes

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Fixes #(issue number)
```

## Coding Standards

### TypeScript/JavaScript (Frontend)

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional components with hooks
- Use meaningful variable and function names

```typescript
// Good
const handleUserAuthentication = async (credentials: LoginCredentials) => {
  // Implementation
};

// Avoid
const handleAuth = async (creds: any) => {
  // Implementation
};
```

### Python (Backend)

- Follow PEP 8 style guide
- Use Black for formatting
- Use type hints for all functions
- Write docstrings for public functions
- Use meaningful variable and function names

```python
# Good
async def process_gemini_response(
    session_id: str, 
    response_data: Dict[str, Any]
) -> ProcessedResponse:
    """Process response from Gemini API and return structured data."""
    # Implementation

# Avoid
async def process_resp(sid, data):
    # Implementation
```

### General Guidelines

- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use consistent naming conventions
- Handle errors gracefully

## Testing

### Frontend Testing

```bash
cd apps/web-app

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Backend Testing

```bash
cd apps/gemini-multimodal-playground/backend

# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=.

# Run specific test file
python -m pytest tests/test_websocket.py
```

### Writing Tests

- Write tests for new functionality
- Include both positive and negative test cases
- Mock external dependencies
- Use descriptive test names

## Documentation

### Types of Documentation

- **Code comments**: Explain complex logic
- **README files**: Setup and usage instructions
- **API documentation**: Endpoint descriptions
- **Architecture docs**: System design and decisions

### Documentation Standards

- Use clear, concise language
- Include code examples
- Keep documentation up-to-date with code changes
- Use proper markdown formatting

## Getting Help

### Resources

- **Documentation**: Check the docs folder for detailed guides
- **Issues**: Search existing issues for similar problems
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Learn from pull request feedback

### Communication

- Be patient and respectful
- Provide context when asking questions
- Include relevant code snippets and error messages
- Follow up on feedback and suggestions

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions
- Project documentation

Thank you for contributing to the Gemini Realtime Monorepo! 🚀

# Gemini Realtime Monorepo

A complete SaaS application for testing and demonstrating Google's Gemini Live API capabilities, featuring real-time multimodal AI conversations with voice, video, and screen sharing support.

## Overview

This monorepo contains a full-stack application that showcases the power of Google's Gemini Live API through an intuitive web interface. The project combines a modern Next.js SaaS frontend with a robust Python FastAPI backend to deliver real-time AI interactions.

## Demo Video

See the complete Gemini Live application in action:

https://github.com/user-attachments/assets/demo-arkely.mp4

*The demo showcases real-time voice conversations, video chat functionality, screen sharing capabilities, and the complete SaaS platform including user management, token tracking, and admin features.*

### Features

This is a complete SaaS application offering advanced AI conversation capabilities:

#### Core AI Features
- **Audio Chat Functionality**: Real-time voice conversations with Google's Gemini Live API
- **Video Chat Functionality**: Live video streaming with AI visual understanding
- **Screen Sharing Capabilities**: Share your screen for AI analysis and assistance
- **Voice Customization Options**: Multiple voice profiles and speaking styles
- **Language Selection**: Support for multiple languages and locales
- **Conversation Memory**: Long-term memory management using Mem0 and PostgreSQL

#### User Management & Analytics
- **Token Usage Tracking**: Per-user monitoring of API consumption and costs
- **Super Admin System**: Comprehensive admin dashboard for user management
  - Delete users and manage accounts
  - Assign and disable AI models per user
  - Monitor system-wide usage and performance
  - Configure user permissions and access levels
- **User Authentication**: Secure OAuth integration with Google and GitHub
- **Subscription Management**: Stripe-powered billing with multiple tiers

#### Advanced Platform Features
- **Multi-Session Support**: Handle multiple concurrent AI conversations
- **Real-time Interruptions**: Natural conversation flow with interrupt handling
- **Session Persistence**: Save and resume conversations across sessions
- **Usage Analytics**: Detailed reporting on API usage, costs, and performance
- **Rate Limiting**: Configurable limits per user and subscription tier
- **Webhook Integration**: Real-time notifications and third-party integrations

#### Developer & Admin Tools
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Health Monitoring**: System status and performance monitoring
- **Error Tracking**: Comprehensive logging and error reporting
- **Database Management**: PostgreSQL with Prisma ORM
- **Email System**: Transactional emails via Resend
- **Security Features**: CORS, rate limiting, and input validation

## Architecture

This monorepo is built with [Turborepo](https://turbo.build/repo) and consists of two main applications:

```
gemini-realtime-monorepo/
├── apps/
│   ├── web-app/                    # Next.js SaaS Frontend
│   └── gemini-multimodal-playground/
│       ├── backend/                # Python FastAPI Backend
│       ├── frontend/               # Standalone Frontend (for testing)
│       └── standalone/             # Python CLI Version
├── packages/                       # Shared packages
├── docs/                          # Documentation
└── scripts/                       # Build and deployment scripts
```

### Applications

#### Web App (`apps/web-app/`)
A complete Next.js 15 SaaS application featuring:
- **Authentication**: NextAuth.js with Google/GitHub OAuth
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe integration with subscription tiers
- **Email**: Resend for transactional emails
- **UI**: Shadcn/ui components with Tailwind CSS
- **Deployment**: Optimized for Vercel

#### Gemini Backend (`apps/gemini-multimodal-playground/backend/`)
A high-performance FastAPI backend providing:
- **Real-time Communication**: WebSocket connections to Gemini Live API
- **Memory Management**: Persistent conversation memory with Mem0
- **Session Handling**: Multi-user session management
- **Token Tracking**: Usage monitoring and analytics
- **API Documentation**: Auto-generated OpenAPI specs

#### Standalone Components
- **Frontend**: Independent Next.js app for testing Gemini features
- **CLI Tool**: Python script for direct API interaction

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.11+
- PostgreSQL database
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gemini-realtime-monorepo.git
   cd gemini-realtime-monorepo
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Web App
   cp apps/web-app/.env.example apps/web-app/.env.local

   # Backend
   cp apps/gemini-multimodal-playground/backend/.env.example apps/gemini-multimodal-playground/backend/.env
   ```

4. **Configure your environment files** with your API keys and database credentials

5. **Start development servers**
   ```bash
   # Start all applications
   pnpm dev

   # Or start individually
   cd apps/web-app && pnpm dev              # Frontend on :3000
   cd apps/gemini-multimodal-playground/backend && python main.py  # Backend on :8000
   ```

### Testing

Run tests for all components:

```bash
# Backend tests
cd apps/gemini-multimodal-playground/backend
python -m pytest tests/ -v

# Web app tests
cd apps/web-app
pnpm test
```

## Documentation

- **[Installation Guide](apps/web-app/README.md#installation)** - Detailed installation instructions
- **[Web App Documentation](apps/web-app/README.md)** - Frontend application guide
- **[Backend API Documentation](apps/gemini-multimodal-playground/backend/README.md)** - Backend setup and API reference
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project

### Interactive API Documentation

The project features a **unified Swagger interface** that combines both Next.js and FastAPI documentation in a single, easy-to-use interface:

**Unified API Documentation:**
- **Swagger UI**: [http://localhost:3000/api/swagger](http://localhost:3000/api/swagger) (when running locally)
- **OpenAPI JSON**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Server Selection**: Use the dropdown in Swagger UI to switch between:
  - **Next.js Web App API** - Frontend endpoints (authentication, user management, webhooks, utilities)
  - **Gemini Live FastAPI Backend** - Backend endpoints (WebSocket, memory, token tracking, session handling)
- **24 Total Endpoints**: 4 Next.js + 20 FastAPI endpoints in one interface
- **Organized Tags**: Clear "Frontend -" and "Backend -" prefixes for easy navigation

**Individual API Documentation (also available):**
- **FastAPI Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **FastAPI ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Deployment

The application is designed for production deployment with:

- **Frontend**: Vercel (recommended) or any Node.js hosting
- **Backend**: VPS with Python support, Docker, or cloud platforms
- **Database**: Neon, Supabase, or any PostgreSQL provider

See the [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + Shadcn/ui
- **Authentication**: NextAuth.js v5
- **Database**: Prisma + PostgreSQL
- **Payments**: Stripe
- **Email**: Resend + React Email

### Backend
- **Framework**: FastAPI with Python 3.11+
- **Real-time**: WebSockets + Google Gemini Live API
- **Memory**: Mem0 + PostgreSQL
- **Documentation**: Auto-generated OpenAPI
- **Testing**: Pytest

### Infrastructure
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel + VPS

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the docs folder for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions

## Star History

<a href="https://www.star-history.com/#jopadofficiel/gemini-realtime-monorepo&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=jopadofficiel/gemini-realtime-monorepo&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=jopadofficiel/gemini-realtime-monorepo&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=jopadofficiel/gemini-realtime-monorepo&type=Date" />
 </picture>
</a>
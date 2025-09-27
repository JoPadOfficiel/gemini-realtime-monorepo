# Gemini Realtime Web App

A complete Next.js 15 SaaS application that provides an intuitive interface for testing and demonstrating Google's Gemini Live API capabilities. This application features user authentication, subscription management, and seamless integration with the Gemini multimodal backend.

## Overview

This web application serves as the frontend for the Gemini Realtime Monorepo, providing users with a comprehensive SaaS platform to interact with Google's Gemini Live API. It includes everything needed for a production-ready SaaS application: authentication, payments, user management, and a beautiful UI.

### Key Features

- **🔐 Authentication**: Complete auth system with Google/GitHub OAuth via NextAuth.js v5
- **💳 Subscription Management**: Stripe integration with multiple pricing tiers
- **📧 Email System**: Transactional emails with Resend and React Email
- **🎨 Modern UI**: Beautiful interface built with Shadcn/ui and Tailwind CSS
- **📊 Admin Dashboard**: Comprehensive admin panel for user and subscription management
- **🔗 Backend Integration**: Seamless connection to the Gemini multimodal backend
- **📱 Responsive Design**: Optimized for desktop and mobile devices

## Installation

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (Neon, Supabase, or local)
- Google Gemini API key
- Stripe account (for payments)
- Resend account (for emails)
- OAuth apps (Google/GitHub)

### Quick Start

1. **Navigate to the web app directory**
   ```bash
   cd apps/web-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your `.env.local` file** with your API keys and credentials:
   ```bash
   # Database
   DATABASE_URL="your-postgresql-connection-string"

   # Authentication
   AUTH_SECRET="your-auth-secret"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Stripe
   STRIPE_API_KEY="your-stripe-secret-key"
   STRIPE_WEBHOOK_SECRET="your-webhook-secret"

   # Email
   RESEND_API_KEY="your-resend-api-key"

   # Backend Integration
   NEXT_PUBLIC_GEMINI_BACKEND_URL="http://localhost:8000"
   ```

5. **Set up the database**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`.

### Detailed Setup

For comprehensive setup instructions including OAuth configuration, Stripe setup, and deployment, see our [Deployment Guide](../../docs/DEPLOYMENT.md).

## Architecture

The web application follows a modern Next.js 15 architecture with the App Router:

```
apps/web-app/
├── app/                    # App Router pages and layouts
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── admin/             # Admin panel
│   └── api/               # API routes
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── styles/               # Global styles
```

## Features

### Authentication & User Management
- **OAuth Integration**: Google and GitHub sign-in
- **Session Management**: Secure session handling with NextAuth.js v5
- **User Profiles**: Complete user profile management
- **Admin Panel**: User management and analytics dashboard

### Subscription & Payments
- **Stripe Integration**: Complete payment processing
- **Multiple Tiers**: Pro and Business subscription plans
- **Billing Management**: Customer portal and invoice handling
- **Webhook Processing**: Secure webhook handling for subscription events

### Backend Integration
- **Gemini API**: Seamless connection to the Gemini multimodal backend
- **Real-time Communication**: WebSocket support for live conversations
- **Session Management**: Multi-user session handling
- **Usage Tracking**: Monitor API usage and costs

### UI/UX
- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Optimized for all device sizes
- **Dark/Light Mode**: Theme switching support
- **Accessibility**: WCAG compliant components

## Tech Stack

### Core Framework
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[React 18](https://react.dev/)** - Latest React features

### Authentication & Database
- **[NextAuth.js v5](https://authjs.dev/)** - Complete authentication solution
- **[Prisma](https://www.prisma.io/)** - Type-safe database ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Robust relational database

### Payments & Email
- **[Stripe](https://stripe.com/)** - Payment processing and subscriptions
- **[Resend](https://resend.com/)** - Transactional email service
- **[React Email](https://react.email/)** - Email template framework

### UI & Styling
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - High-quality React components
- **[Framer Motion](https://framer.com/motion)** - Animation library
- **[Lucide Icons](https://lucide.dev/)** - Beautiful icon library

### Development & Deployment
- **[Vercel](https://vercel.com/)** - Deployment and hosting platform
- **[ESLint](https://eslint.org/)** - Code linting and formatting
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Husky](https://typicode.github.io/husky/)** - Git hooks

## Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database with sample data

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript checks
pnpm test             # Run tests

# Email Development
pnpm email:dev        # Start email development server
```

## Environment Variables

See [.env.example](.env.example) for a complete list of required environment variables with detailed documentation.

## Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Configure environment variables** in the Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy your app

### Manual Deployment

1. **Build the application**
   ```bash
   pnpm build
   ```

2. **Start the production server**
   ```bash
   pnpm start
   ```

For detailed deployment instructions, see the [Deployment Guide](../../docs/DEPLOYMENT.md).

## Contributing

Please read our [Contributing Guidelines](../../CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

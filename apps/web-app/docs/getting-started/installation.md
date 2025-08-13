# Installation Guide

This guide will help you set up the Next.js 15 SaaS Stripe Starter locally for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18.17+** (LTS recommended)
- **pnpm** (recommended) or npm/yarn
- **Git** for version control
- **PostgreSQL** database (local or cloud)

## Quick Start

### 1. Create Your Project

Create a new directory for your project:

```bash
mkdir my-saas-project
cd my-saas-project
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 4. Configure Environment Variables

Open `.env.local` and configure the following variables:

#### Database Configuration
```env
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
```

#### Authentication (Auth.js v5)
```env
AUTH_SECRET="your-auth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth (optional)
GITHUB_OAUTH_TOKEN="your-github-token"
```

#### Email Configuration (Resend)
```env
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="noreply@yourdomain.com"
```

#### Stripe Configuration
```env
STRIPE_API_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"

# Stripe Product IDs
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID="price_your-monthly-plan"
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID="price_your-yearly-plan"
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID="price_your-business-monthly"
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID="price_your-business-yearly"
```

### 5. Configure Google OAuth (Optional)

If you want to enable Google authentication, follow these steps:

#### Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Navigate to "Credentials" in the left sidebar
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Configure the OAuth consent screen if prompted
7. Set the application type to "Web application"
8. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`

#### Step 2: Configuration Example

Here's what your Google OAuth configuration should look like:

![Google OAuth Configuration](../assets/images/gg-auth-config.jpg)

#### Step 3: Update Environment Variables

Copy the Client ID and Client Secret from Google Cloud Console and add them to your `.env.local`:

```env
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
```

> **Note**: The Google OAuth integration is optional. You can skip this step and still use email/password authentication or other OAuth providers.

### 6. Database Setup

Initialize your database:

```bash
# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# (Optional) Open Prisma Studio to view your database
pnpm db:studio
```

### 7. Start Development Server

```bash
# Start with Turbopack (recommended for development)
pnpm dev

# Or start with Webpack
pnpm dev:webpack
```

Your application will be available at `http://localhost:3000`.

### 8. Verify Installation

Once the development server is running, verify that everything is working:

1. **Homepage**: Visit `http://localhost:3000` - you should see the SaaS starter homepage
2. **Authentication**: Try the sign-in flow (if you configured OAuth providers)
3. **Documentation**: Visit `http://localhost:3000/docs` to see the documentation
4. **Blog**: Visit `http://localhost:3000/blog` to see the blog posts
5. **Dashboard**: Sign in and access the user dashboard

If you configured Google OAuth, you should see the Google sign-in option on the authentication pages.

## Build Commands

The project supports multiple build configurations optimized for Next.js 15:

### Development
```bash
# Fast development with Turbopack (recommended)
pnpm dev

# Traditional development with Webpack
pnpm dev:webpack
```

### Production
```bash
# Production build (recommended for deployment)
pnpm build

# Production build with Turbopack (faster, experimental)
pnpm build:turbo

# Build and start production server locally
pnpm preview
```

### Utilities
```bash
# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix

# Clean build artifacts
pnpm clean

# Bundle analysis
pnpm build:analyze
```

## Troubleshooting

### Common Issues

#### Port Already in Use
If port 3000 is busy, Next.js will automatically use the next available port (3001, 3002, etc.).

#### Database Connection Issues
1. Ensure PostgreSQL is running
2. Verify your `DATABASE_URL` is correct
3. Check database permissions
4. Test connection: `pnpm db:studio`

#### Build Errors
1. Clear Next.js cache: `pnpm clean`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
3. Check for TypeScript errors: `pnpm type-check`
4. Verify all environment variables are set

#### Content Collections Issues
1. Restart the development server
2. Check frontmatter syntax in MDX files
3. Verify file paths match collection configuration
4. Check for Content Collections processing errors in terminal

#### Dark Mode Code Visibility
If code blocks are not visible in dark mode:
1. Clear browser cache
2. Restart development server
3. Check if custom CSS is overriding styles

### Performance Tips

#### Development
- Use `pnpm dev` (Turbopack) for fastest development experience
- Enable bundle analysis with `pnpm build:analyze` to identify large dependencies
- Use React DevTools Profiler to identify performance bottlenecks

#### Production
- Always use `pnpm build` for production deployments
- Enable compression in your hosting platform
- Optimize images using Next.js Image component
- Use static generation where possible

### Getting Help

- **Documentation**: Check the `/docs` folder for detailed guides
- **Content Issues**: See `/docs/troubleshooting/content-issues.md`
- **Markdown Features**: See `/docs/content/markdown-features.md`

## Next Steps

After installation, you might want to:

1. **Configure Authentication** - Set up OAuth providers in `/content/docs/configuration/authentification.mdx`
2. **Set Up Stripe** - Configure payment processing in `/content/docs/configuration/subscriptions.mdx`
3. **Customize Content** - Add your own blog posts and documentation
4. **Customize Design** - Modify components and styling to match your brand
5. **Deploy** - Deploy to your preferred platform

## Development Workflow

### Content Management
- Use Content Collections for type-safe content
- Organize content in the `/content` directory
- Leverage MDX for rich, interactive content
- All content is automatically validated and type-checked

### Database Management
- Use Prisma Studio for database visualization: `pnpm db:studio`
- Run migrations in development: `pnpm db:migrate`
- Keep schema in sync: `pnpm db:push`
- Generate client after schema changes: `pnpm db:generate`

### Code Quality
- Run type checking: `pnpm type-check`
- Fix linting issues: `pnpm lint:fix`
- Use Prettier for code formatting
- Follow TypeScript strict mode guidelines

---

You're now ready to start building your SaaS application with Next.js 15! 🚀

The development server includes:
- ⚡ **Hot reloading** for instant feedback
- 🔍 **Type checking** in real-time
- 📝 **Content validation** with Content Collections
- 🎨 **Tailwind CSS** with JIT compilation
- 🔧 **Error overlay** for debugging

# Deployment Guide

This guide covers deploying the Gemini Realtime Monorepo to production environments. The application consists of two main components that can be deployed independently.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Vercel)      │◄──►│     (VPS)       │◄──►│  (PostgreSQL)   │
│   Next.js App   │    │   FastAPI       │    │   Neon/Supabase │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Services
- **Vercel Account** (for frontend deployment)
- **VPS or Cloud Server** (for backend deployment)
- **PostgreSQL Database** (Neon, Supabase, or self-hosted)
- **Domain Names** (optional but recommended)

### API Keys & Credentials
- Google Gemini API key
- Stripe API keys (live mode for production)
- Resend API key
- OAuth app credentials (Google, GitHub)
- Mem0 API key (optional)

## Frontend Deployment (Vercel)

### 1. Prepare the Frontend

```bash
cd apps/web-app
```

### 2. Configure Environment Variables

Create production environment variables in Vercel dashboard:

```bash
# Application URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXTAUTH_URL=https://your-app.vercel.app

# Backend Integration
NEXT_PUBLIC_GEMINI_BACKEND_URL=https://your-backend-domain.com

# Authentication
AUTH_SECRET=your-production-auth-secret-here
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GITHUB_OAUTH_TOKEN=your-production-github-token

# Database
DATABASE_URL=your-production-database-url

# Email
RESEND_API_KEY=your-production-resend-api-key
EMAIL_FROM="Your App <noreply@yourdomain.com>"

# Payments (Stripe Live Keys)
STRIPE_API_KEY=sk_live_your-production-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-production-webhook-secret
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID=price_your-pro-monthly-id
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID=price_your-pro-yearly-id
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID=price_your-business-monthly-id
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID=price_your-business-yearly-id
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

#### Option B: GitHub Integration
1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web-app`
   - **Build Command**: `cd ../.. && pnpm build --filter=web-app`
   - **Output Directory**: `apps/web-app/.next`

### 4. Configure Custom Domain (Optional)

1. Add your domain in Vercel dashboard
2. Update DNS records as instructed
3. Update environment variables with new domain

## Backend Deployment (VPS)

### 1. Server Setup

#### Recommended Specifications
- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Storage**: 20GB+ SSD
- **OS**: Ubuntu 20.04+ or similar

#### Initial Server Configuration
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install system dependencies
sudo apt install postgresql-client git nginx certbot python3-certbot-nginx -y
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/your-username/gemini-realtime-monorepo.git
cd gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with production values
```

### 3. Environment Configuration

```bash
# Production environment variables
GEMINI_API_KEY=your-production-gemini-api-key
MEM0_API_KEY=your-production-mem0-api-key

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=false
CORS_ORIGINS=https://your-app.vercel.app

# Database
DATABASE_URL=your-production-database-url
```

### 4. Process Management with Systemd

Create service file:
```bash
sudo nano /etc/systemd/system/gemini-backend.service
```

```ini
[Unit]
Description=Gemini Backend API
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend
Environment=PATH=/path/to/gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend/venv/bin
ExecStart=/path/to/gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend/venv/bin/python main.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gemini-backend
sudo systemctl start gemini-backend
sudo systemctl status gemini-backend
```

### 5. Nginx Configuration

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/gemini-backend
```

```nginx
server {
    listen 80;
    server_name your-backend-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/gemini-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate

#### Option A: Let's Encrypt with Certbot (Traditional)

```bash
sudo certbot --nginx -d your-backend-domain.com
```

#### Option B: Cloudflare Tunnel (Recommended Alternative)

Cloudflare Tunnel provides secure HTTPS access without purchasing SSL certificates or exposing your server's IP address.

**Setup Cloudflare Tunnel:**

1. **Install cloudflared:**
```bash
# Ubuntu/Debian
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Or using package manager
sudo apt-get install cloudflared
```

2. **Authenticate with Cloudflare:**
```bash
cloudflared tunnel login
```

3. **Create a tunnel:**
```bash
cloudflared tunnel create gemini-backend
```

4. **Configure the tunnel:**
```bash
# Create config file
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Add this configuration:
```yaml
tunnel: your-tunnel-id
credentials-file: /root/.cloudflared/your-tunnel-id.json

ingress:
  - hostname: your-backend-domain.com
    service: http://localhost:8000
  - service: http_status:404
```

5. **Create DNS record:**
```bash
cloudflared tunnel route dns gemini-backend your-backend-domain.com
```

6. **Run the tunnel:**
```bash
# Test run
cloudflared tunnel run gemini-backend

# Install as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

**Benefits of Cloudflare Tunnel:**
- ✅ **Free SSL certificates** (automatic renewal)
- ✅ **DDoS protection** included
- ✅ **No exposed IP address** (enhanced security)
- ✅ **Global CDN** for better performance
- ✅ **Easy setup** (no nginx SSL configuration needed)
- ✅ **Automatic failover** and load balancing

**Update your environment variables:**
```bash
# Frontend .env
NEXT_PUBLIC_GEMINI_BACKEND_URL=https://your-backend-domain.com

# Backend .env
CORS_ORIGINS=https://your-app.vercel.app
```

## Database Setup

### Option A: Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update `DATABASE_URL` in both frontend and backend

### Option B: Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Get PostgreSQL connection details
4. Update `DATABASE_URL` in both frontend and backend

### Option C: Self-hosted PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql
CREATE DATABASE gemini_db;
CREATE USER gemini_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE gemini_db TO gemini_user;
\q
```

## Monitoring & Maintenance

### Health Checks

```bash
# Check backend health
curl https://your-backend-domain.com/health

# Check frontend
curl https://your-app.vercel.app/api/health
```

### Log Monitoring

```bash
# Backend logs
sudo journalctl -u gemini-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Strategy

1. **Database**: Set up automated backups with your provider
2. **Application**: Use Git for version control
3. **Environment**: Document all configuration changes

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `CORS_ORIGINS` includes your frontend domain
2. **WebSocket Issues**: Check Nginx WebSocket configuration
3. **Database Connection**: Verify connection string and network access
4. **SSL Issues**: Ensure certificates are valid and auto-renewal is configured

### Performance Optimization

1. **Frontend**: Enable Vercel Edge Functions
2. **Backend**: Use connection pooling for database
3. **CDN**: Configure Vercel CDN for static assets
4. **Caching**: Implement Redis for session caching (optional)

## Security Checklist

- [ ] All environment variables use production values
- [ ] SSL certificates are configured and auto-renewing
- [ ] Database connections use SSL
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Firewall rules are configured
- [ ] Regular security updates are applied

## Scaling Considerations

### Horizontal Scaling
- Use load balancer for multiple backend instances
- Implement session affinity for WebSocket connections
- Use Redis for shared session storage

### Vertical Scaling
- Monitor CPU and memory usage
- Upgrade server resources as needed
- Optimize database queries and connections

For additional support, see the [Contributing Guidelines](../CONTRIBUTING.md) or open an issue.

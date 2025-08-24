# 🚀 Guide de Déploiement Automatique - Gemini Realtime Monorepo

## 📋 Architecture de Déploiement

- **Web App** (`apps/web-app/`) → **Netlify** (Frontend Next.js)
- **Backend Gemini** (`apps/gemini-multimodal-playground/backend/`) → **VPS** (API Python)
- **Frontend Gemini** (`apps/gemini-multimodal-playground/frontend/`) → **Local uniquement** (Tests)

## 🔐 Configuration des Secrets GitHub (OBLIGATOIRE)

### 📝 Liste Complète des Secrets à Configurer

#### 🌐 Secrets pour Web App (Netlify)
```
NEXTAUTH_URL
AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GITHUB_OAUTH_TOKEN
DATABASE_URL
RESEND_API_KEY
EMAIL_FROM
STRIPE_API_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

#### 🖥️ Secrets pour Backend VPS
```
VPS_SSH_PRIVATE_KEY
VPS_USER
VPS_HOST
VPS_DEPLOY_PATH
VPS_BACKEND_URL
```

## 🛠️ Instructions de Configuration (Étape par Étape)

### 1️⃣ Configuration des Secrets GitHub

1. **Allez dans votre repository GitHub**
2. **Cliquez sur `Settings`** (onglet en haut)
3. **Dans le menu de gauche, cliquez sur `Secrets and variables` → `Actions`**
4. **Cliquez sur `New repository secret`**
5. **Ajoutez chaque secret un par un** avec les valeurs appropriées

#### 📋 Valeurs d'Exemple pour les Secrets

```bash
# Web App Secrets
NEXTAUTH_URL=https://votre-app.netlify.app
AUTH_SECRET=un-secret-aleatoire-de-64-caracteres-minimum
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre_secret_google
GITHUB_OAUTH_TOKEN=ghp_votre_token_github
DATABASE_URL=postgresql://user:password@host:5432/database
RESEND_API_KEY=re_votre_cle_resend
EMAIL_FROM=noreply@votre-domaine.com
STRIPE_API_KEY=sk_test_ou_live_votre_cle_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret
NEXT_PUBLIC_APP_URL=https://votre-app.netlify.app
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID=price_votre_plan_id
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID=price_votre_plan_id
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID=price_votre_plan_id
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID=price_votre_plan_id

# Netlify Secrets
NETLIFY_AUTH_TOKEN=votre_token_netlify
NETLIFY_SITE_ID=votre_site_id_netlify

# VPS Secrets
VPS_SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
votre_cle_privee_ssh_complete
-----END OPENSSH PRIVATE KEY-----
VPS_USER=root
VPS_HOST=123.456.789.123
VPS_DEPLOY_PATH=/root/gemini-realtime-monorepo
VPS_BACKEND_URL=http://123.456.789.123:8000
```

### 2️⃣ Configuration VPS (Simple)

**Sur votre VPS, exécutez ces commandes :**

```bash
# 1. Installer Python et Git
apt update && apt install -y python3 python3-pip git

# 2. Cloner le repository
cd /root
git clone https://github.com/votre-username/gemini-realtime-monorepo.git

# 3. Installer les dépendances Python
cd gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend
pip3 install -r requirements.txt

# 4. Créer le fichier .env avec votre clé Gemini
echo "GEMINI_API_KEY=votre_cle_gemini_api" > .env
echo "PORT=8000" >> .env
echo "HOST=0.0.0.0" >> .env
```

### 3️⃣ Configuration Netlify (Optionnel)

**Le déploiement se fait automatiquement via GitHub Actions, mais vous pouvez aussi :**

1. Connecter votre repository à Netlify
2. Laisser GitHub Actions gérer le déploiement automatiquement

## 🚀 Comment Déclencher le Déploiement

### ✅ Déploiement Automatique
Le déploiement se fait **automatiquement** quand vous :
1. **Push du code** sur la branche `main` ou `develop`
2. **Ou cliquez sur "Run workflow"** dans l'onglet Actions de GitHub

### 🔄 Déploiement Manuel
1. Allez dans l'onglet **Actions** de votre repository GitHub
2. Cliquez sur **Deploy Applications**
3. Cliquez sur **Run workflow**
4. Sélectionnez la branche et cliquez **Run workflow**

## 📊 Monitoring et Vérification

### ✅ Vérifier que tout fonctionne
- **Web App** : https://votre-app.netlify.app
- **Backend API** : http://votre-vps:8000/health

### 📋 Logs GitHub Actions
1. Allez dans l'onglet **Actions** de votre repository
2. Cliquez sur le dernier workflow exécuté
3. Consultez les logs pour chaque étape

### 🐛 Logs Backend VPS
```bash
# Sur votre VPS, voir les logs du backend
tail -f /tmp/gemini-backend.log

# Vérifier si le processus tourne
ps aux | grep python
```

## 🆘 Troubleshooting Simple

### ❌ Problèmes Courants

1. **❌ Build échoue** → Vérifiez que tous les secrets GitHub sont configurés
2. **❌ Backend ne démarre pas** → Vérifiez les logs : `tail -f /tmp/gemini-backend.log`
3. **❌ SSH échoue** → Vérifiez que la clé SSH privée est correcte dans les secrets
4. **❌ API non accessible** → Vérifiez que le port 8000 est ouvert sur votre VPS

### 🔧 Commandes de Dépannage VPS

```bash
# Redémarrer le backend manuellement
cd /root/gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend
pkill -f "python.*main.py"
nohup python3 main.py > /tmp/gemini-backend.log 2>&1 &

# Tester l'API
curl http://localhost:8000/health

# Voir les processus Python
ps aux | grep python
```

## 🎉 C'est Tout !

Une fois les secrets configurés, le déploiement est **100% automatique** !
Chaque push sur `main` ou `develop` déploie automatiquement vos applications.

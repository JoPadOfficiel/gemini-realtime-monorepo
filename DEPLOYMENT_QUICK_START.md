# 🚀 Déploiement Automatique - Guide Rapide

## 📋 Résumé
- **Web App** → Netlify (automatique)
- **Backend Gemini** → VPS (automatique)
- **Déploiement** → GitHub Actions (automatique)

## 🔐 Étape 1 : Configurer les Secrets GitHub

### 📍 Où configurer ?
1. Allez sur votre repository GitHub
2. `Settings` → `Secrets and variables` → `Actions`
3. Cliquez `New repository secret`

### 📝 Secrets à ajouter (22 au total)

#### 🌐 Pour la Web App (17 secrets)
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

#### 🖥️ Pour le VPS (5 secrets)
```
VPS_SSH_PRIVATE_KEY
VPS_USER
VPS_HOST
VPS_DEPLOY_PATH
VPS_BACKEND_URL
```

## 🖥️ Étape 2 : Préparer le VPS

### Commandes à exécuter sur votre VPS :

```bash
# 1. Installer les dépendances
apt update && apt install -y python3 python3-pip git

# 2. Cloner le repository
cd /root
git clone https://github.com/VOTRE_USERNAME/gemini-realtime-monorepo.git

# 3. Installer les dépendances Python
cd gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend
pip3 install -r requirements.txt

# 4. Créer le fichier .env
echo "GEMINI_API_KEY=votre_cle_gemini" > .env
echo "PORT=8000" >> .env
echo "HOST=0.0.0.0" >> .env
```

## 🚀 Étape 3 : Déployer

### ✅ Déploiement Automatique
Le déploiement se fait automatiquement quand vous :
- Push du code sur `main` ou `develop`
- Ou via l'onglet Actions → "Run workflow"

### 📊 Vérifier le Déploiement
- **Web App** : https://votre-app.netlify.app
- **Backend** : http://votre-vps:8000/health

## 🆘 Aide Rapide

### ❌ Si ça ne marche pas :
1. **Vérifiez les secrets GitHub** (22 secrets requis)
2. **Consultez les logs** dans l'onglet Actions de GitHub
3. **Sur le VPS** : `tail -f /tmp/gemini-backend.log`

### 🔧 Redémarrer le Backend Manuellement
```bash
# Sur votre VPS
cd /root/gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend
pkill -f "python.*main.py"
nohup python3 main.py > /tmp/gemini-backend.log 2>&1 &
```

## 📚 Documentation Complète
Voir `docs/DEPLOYMENT.md` pour plus de détails.

---
**🎉 Une fois configuré, tout est automatique !**

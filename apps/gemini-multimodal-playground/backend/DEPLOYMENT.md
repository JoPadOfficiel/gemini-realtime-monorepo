# Configuration Production - Backend Gemini

## Problème résolu

Les changements précédents dans l'API proxy Vercel ont été annulés car ils ne supportaient pas WebSocket, nécessaire pour l'application Gemini Live.

## Solution : Cloudflare Tunnel

Le backend doit être exposé en HTTPS pour fonctionner avec le frontend Vercel. Cloudflare Tunnel permet d'exposer le backend HTTP via une URL HTTPS gratuite.

## Installation sur le serveur VPS

### Étape 1 : Installation de cloudflared

```bash
# Télécharger cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb

# Installer
sudo dpkg -i cloudflared.deb

# Nettoyer
rm cloudflared.deb
```

### Étape 2 : Démarrer le tunnel

```bash
# Démarrer le tunnel pour le backend sur le port 8000
cloudflared tunnel --url http://localhost:8000
```

Sortie attendue :
```
Your quick Tunnel has been created! Visit it at:
https://abc123-def456-ghi789.trycloudflare.com
```

### Étape 3 : Configuration permanente

Pour maintenir le tunnel actif en arrière-plan :

```bash
# Lancer en arrière-plan
nohup cloudflared tunnel --url http://localhost:8000 > tunnel.log 2>&1 &

# Vérifier que le processus fonctionne
ps aux | grep cloudflared

# Voir les logs
tail -f tunnel.log
```

### Étape 4 : Configuration Vercel

Dans le dashboard Vercel, mettre à jour la variable d'environnement :
- `NEXT_PUBLIC_GEMINI_BACKEND_URL` = `https://votre-url-tunnel.trycloudflare.com`

## Test de fonctionnement

```bash
# Tester l'endpoint de santé
curl https://votre-url-tunnel.trycloudflare.com/health
```

Réponse attendue :
```json
{"status":"healthy","timestamp":1234567890.123}
```

## Dépannage

### Problème : WebSocket connection failed
- Vérifier que le tunnel fonctionne
- Tester l'URL du tunnel
- Redémarrer le tunnel si nécessaire

### Problème : Backend connection failed
- Vérifier que le backend Python fonctionne sur le port 8000
- Redémarrer le service backend si nécessaire

```bash
# Vérifier le backend
ps aux | grep python
cd /home/gemini-realtime-monorepo/apps/gemini-multimodal-playground/backend
python main.py
```

## Notes importantes

- Les tunnels gratuits n'ont pas de garantie de disponibilité
- L'URL du tunnel change à chaque redémarrage
- Pour la production, utiliser un tunnel nommé avec un compte Cloudflare
- Le tunnel supporte WebSocket contrairement à l'API proxy Vercel

## Configuration automatique

Si vous préférez une configuration automatique, l'assistant peut se connecter au serveur et configurer le tunnel directement.

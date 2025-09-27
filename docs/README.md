# Gemini Live SaaS Documentation

## Overview

This documentation covers the complete architecture of the Gemini Live SaaS project, including performance optimizations and scalability improvements.

## Documentation Structure

### 📋 Available Documents

1. **[Scalability Optimizations](./scalability-optimizations.md)**
   - Performance bottleneck resolution
   - Mem0 asynchronous queue implementation
   - UI blocking elimination (200-500ms → <1ms)

## Project Architecture

### 🏗️ Hybrid Architecture

The project uses an optimized hybrid architecture:

- **WebSocket**: Real-time communications (audio, video, interruptions)
- **REST API**: Non-critical operations (tokens, sessions, memory)
- **Asynchronous Queue**: Background processing for Mem0

### 🔧 Main Components

```
gemini-realtime-monorepo/
├── apps/gemini-multimodal-playground/
│   ├── backend/
│   │   ├── main.py              # Main FastAPI server
│   │   ├── async_memory.py      # Mem0 asynchronous queue
│   │   └── simple_memory.py     # Memory manager
│   └── frontend/
│       ├── components/
│       │   └── gemini-playground.tsx  # Hybrid interface
│       └── lib/
│           └── utils.ts         # GeminiApiService
└── docs/
    ├── README.md                # This file
    └── scalability-optimizations.md  # Detailed optimizations
```

## Available APIs

### 🔄 Synchronous REST APIs (Compatibility)

```http
POST /api/memory/add          # Synchronous memory save
POST /api/memory/query        # Synchronous memory query
GET  /api/tokens/usage/{id}   # Token usage
GET  /api/sessions            # Active sessions
```

### ⚡ Asynchronous REST APIs (Performance Optimized)

```http
POST /api/memory/save-async   # Non-blocking memory save
POST /api/memory/query-async  # Non-blocking memory query
GET  /api/memory/task/{id}    # Asynchronous task status
```

### 🌐 WebSocket

```
ws://localhost:8000/ws/{session_id}
```

**Supported messages:**
- Bidirectional audio streaming
- Real-time transcriptions
- User interruptions
- Session management

## Performance Optimizations

### 🚨 Problem Solved: UI Blocking

**Before:**
- Synchronous Mem0 calls blocking the interface (200-500ms)
- Choppy user experience
- Noticeable freezes during saves

**After:**
- Asynchronous queue with immediate response (<1ms)
- Smooth and responsive interface
- Transparent background processing

### 📊 Improvement Metrics

| Aspect | Before | After | Gain |
|--------|-------|-------|------|
| UI response time | 200-500ms | <1ms | **99.8%** |
| Interface blocking | Yes | No | **Eliminated** |
| Memory throughput | 1 op/500ms | Unlimited | **∞** |

## Installation and Setup

### Prerequisites

```bash
# Python 3.11+
python --version

# Node.js 18+
node --version

# pnpm
pnpm --version
```

### Configuration

```bash
# 1. Clone the repository
git clone <repository-url>
cd gemini-realtime-monorepo

# 2. Install Python dependencies
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# 3. Install Node.js dependencies
pnpm install

# 4. Environment configuration
cp .env.example .env
# Edit .env with your API keys
```

### Démarrage

```bash
# Terminal 1 - Backend
cd apps/gemini-multimodal-playground/backend
source ../../../.venv/bin/activate
python main.py

# Terminal 2 - Frontend  
cd apps/gemini-multimodal-playground/frontend
pnpm dev
```

**URLs d'accès :**
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- Documentation Swagger : http://localhost:8000/docs

## Tests et Validation

### Validation des Optimisations

1. **Test de Performance UI**
   ```bash
   # Mesurer le temps de réponse avant/après
   curl -w "@curl-format.txt" -X POST http://localhost:8000/api/memory/save-async
   ```

2. **Test de Charge**
   ```bash
   # Tester la queue asynchrone
   for i in {1..10}; do
     curl -X POST http://localhost:8000/api/memory/save-async &
   done
   ```

3. **Monitoring des Tâches**
   ```bash
   # Vérifier le statut des tâches
   curl http://localhost:8000/api/memory/task/{task_id}
   ```

## Déploiement Production

### Configuration Recommandée

```yaml
# docker-compose.prod.yml
services:
  redis:
    image: redis:alpine
    command: redis-server --maxmemory 512mb
  
  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - ASYNC_QUEUE_WORKERS=4
    depends_on: [redis]
  
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
```

### Monitoring Production

- **Métriques** : Prometheus + Grafana
- **Logs** : Structured logging avec timestamps
- **Alertes** : Queue depth, error rates, response times

## Évolutions Futures

### Roadmap Technique

1. **Phase 1** ✅ : Architecture hybride de base
2. **Phase 2** ✅ : Queue asynchrone Mem0
3. **Phase 3** 🔄 : Redis backend pour persistance
4. **Phase 4** 📋 : Horizontal scaling avec Kubernetes
5. **Phase 5** 📋 : Microservices et event streaming

### Optimisations Avancées

- **Cache Redis** : Réduction des appels API redondants
- **Connection Pooling** : Optimisation des connexions DB
- **CDN Integration** : Assets statiques optimisés
- **Rate Limiting** : Protection contre la surcharge

## Support et Maintenance

### Logs Importants

```bash
# Queue asynchrone
🚀 Async Memory Queue initialized and worker started
📝 Memory save queued for session xxx... (task: yyy...)
✅ Task yyy... completed successfully

# Erreurs à surveiller
❌ Task xxx... failed: Connection timeout
🔄 Retrying task xxx... in 4s (attempt 2/3)
```

### Dépannage Courant

1. **Queue bloquée** : Redémarrer le worker async
2. **Mem0 indisponible** : Vérifier les clés API
3. **Performance dégradée** : Monitorer la queue depth

---

## Contribution

Pour contribuer aux optimisations de performance :

1. Identifier les goulots d'étranglement avec profiling
2. Implémenter les solutions dans une branche dédiée
3. Documenter les améliorations dans `docs/`
4. Tester les performances avant/après
5. Créer une pull request avec métriques

**Contact :** Voir les maintainers du projet pour questions techniques.

# 🚀 DEPLOYMENT GUIDE

## Status

✅ **GitHub Repository**: https://github.com/antirom-design/shoutbox
✅ **Frontend (Vercel)**: https://frontend-o4qkp8i61-antiroms-projects.vercel.app

⚠️ **Backend (Render)**: Manuelles Setup erforderlich (siehe unten)

---

## 🔧 BACKEND DEPLOYMENT (Render)

### Schritt 1: Render Dashboard öffnen

1. Gehe zu https://render.com
2. Melde dich an (oder erstelle Account)
3. Klicke auf "New +" → "Web Service"

### Schritt 2: GitHub Repo verbinden

1. Wähle dein GitHub-Konto
2. Suche nach `shoutbox` Repository
3. Klicke auf "Connect"

### Schritt 3: Service konfigurieren

Fülle die Felder wie folgt aus:

| Feld | Wert |
|------|------|
| **Name** | `shoutbox-backend` |
| **Region** | Frankfurt (EU Central) oder nächstgelegene |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### Schritt 4: Redis hinzufügen

1. Scrolle auf der Render-Seite nach unten zu "Add-ons"
2. Klicke auf "Add Redis"
3. Wähle "Free" Plan
4. Name: `shoutbox-redis`
5. Klicke "Create Database"

Render erstellt automatisch eine interne `REDIS_URL` Environment Variable.

### Schritt 5: Environment Variables setzen

Klicke auf "Environment" Tab und füge hinzu:

| Key | Value |
|-----|-------|
| `PORT` | `3000` |
| `REDIS_URL` | (wird automatisch gesetzt durch Redis Add-on) |
| `FRONTEND_URL` | `https://frontend-o4qkp8i61-antiroms-projects.vercel.app` |

**Wichtig**: Die `FRONTEND_URL` ist bereits oben angegeben. Kopiere sie genau!

### Schritt 6: Deploy starten

1. Klicke auf "Create Web Service"
2. Warte 2-3 Minuten auf den Build
3. Deine Backend-URL erscheint oben (z.B. `https://shoutbox-backend-xyz.onrender.com`)
4. **Kopiere diese URL** - du brauchst sie gleich!

### Schritt 7: Health-Check testen

Öffne in deinem Browser:
```
https://deine-backend-url.onrender.com/health
```

Du solltest sehen:
```json
{"status":"ok","timestamp":1234567890}
```

---

## 🌐 FRONTEND AKTUALISIEREN (Vercel)

Jetzt musst du die Backend-URL im Frontend setzen.

### Schritt 1: Vercel Dashboard öffnen

1. Gehe zu https://vercel.com
2. Öffne das Projekt "frontend"
3. Gehe zu "Settings" → "Environment Variables"

### Schritt 2: Backend-URL setzen

1. Klicke "Add New"
2. **Key**: `VITE_BACKEND_URL`
3. **Value**: `https://deine-backend-url.onrender.com` (OHNE `/health`)
4. **Environment**: Production, Preview, Development (alle auswählen)
5. Klicke "Save"

### Schritt 3: Redeploy

1. Gehe zu "Deployments" Tab
2. Klicke auf den neuesten Deployment
3. Klicke auf die drei Punkte (⋯) → "Redeploy"
4. Bestätige mit "Redeploy"

Nach ~30 Sekunden ist deine App live mit verbundenem Backend!

---

## ✅ VERIFIKATION

### Test 1: Frontend öffnen
```
https://frontend-o4qkp8i61-antiroms-projects.vercel.app
```

Du solltest den "Welcome to Shoutbox" Screen sehen.

### Test 2: Name eingeben
1. Gib einen Namen ein (z.B. "TestUser")
2. Klicke "Continue"
3. Wenn es funktioniert → Socket.io-Connection läuft!

### Test 3: Raum erstellen
1. Klicke "Create New Room"
2. Du solltest einen 6-stelligen Code sehen (z.B. `XJ9L2W`)
3. Öffne ein Inkognito-Fenster
4. Gib einen anderen Namen ein
5. Gib den selben Room-Code ein
6. Beide sollten sich im selben Raum sehen!

### Test 4: Poll-Spiel
1. Als erster User (Owner): Klicke "Start Poll"
2. Gib eine Frage + Optionen ein
3. Beide User sollten die Poll sehen
4. Beide voten
5. Nach 30 Sekunden: Ergebnis erscheint!

---

## 🔥 TROUBLESHOOTING

### Problem: "Connection Error" im Frontend

**Lösung:**
1. Checke Vercel Environment Variables: Ist `VITE_BACKEND_URL` gesetzt?
2. Checke Render Backend: Läuft der Service? (grüner Status)
3. Öffne Browser DevTools (F12) → Console: Was für Fehler?
4. Checke Render Logs: Dashboard → Logs Tab

### Problem: Backend Build schlägt fehl

**Lösung:**
1. Checke Render Logs für Fehlermeldungen
2. Häufig: `Root Directory` falsch gesetzt → muss `backend` sein
3. Checke `package.json` in `/backend` → alle Dependencies da?

### Problem: Redis Connection Error

**Lösung:**
1. Gehe zu Render Dashboard → Redis Instance
2. Checke Status (sollte "Available" sein)
3. Gehe zu Web Service → Environment → Checke `REDIS_URL`
4. Render sollte das automatisch verbinden

### Problem: CORS Error

**Lösung:**
1. Checke Backend `server.js`: Ist `FRONTEND_URL` in CORS-Config?
2. Checke Render Environment Variable: Stimmt `FRONTEND_URL`?
3. WICHTIG: URL OHNE trailing slash (`/`)

---

## 🎨 CUSTOM DOMAIN (Optional)

### Vercel Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Klicke "Add"
3. Gib deine Domain ein (z.B. `shoutbox.beispiel.de`)
4. Folge den DNS-Anweisungen
5. Nach ~24h: HTTPS automatisch via Let's Encrypt

### Render Custom Domain

1. Render Dashboard → Settings → Custom Domain
2. Gib Backend-Subdomain ein (z.B. `api.beispiel.de`)
3. DNS CNAME Record auf Render-URL setzen
4. HTTPS automatisch via Let's Encrypt

**Dann:**
- Vercel `VITE_BACKEND_URL` auf `https://api.beispiel.de` ändern
- Render `FRONTEND_URL` auf `https://shoutbox.beispiel.de` ändern

---

## 📊 MONITORING & LOGS

### Render Logs ansehen

1. Render Dashboard → dein Service
2. "Logs" Tab oben rechts
3. Echtzeit-Logs für alle Socket.io-Events
4. Filter: `Error` für nur Fehler

### Vercel Analytics

1. Vercel Dashboard → Analytics Tab
2. Siehe Page-Views, Performance-Metriken
3. Kostenlos für Hobby-Plan

### Redis Monitoring

1. Render Dashboard → Redis Instance
2. "Metrics" Tab zeigt:
   - Memory Usage
   - Commands/sec
   - Connected Clients

**Warnung**: Free Redis hat 25 MB Limit!
- Bei ~20 MB: Alte Räume manuell löschen oder TTL reduzieren

---

## 🔐 SICHERHEIT (Production Hardening)

### Empfohlene nächste Schritte:

1. **Redis Password**:
   - Render Redis → Settings → Regenerate Password
   - Automatisch in `REDIS_URL` eingebunden

2. **Rate-Limiting verschärfen**:
   - Edit `server.js`:
     - `create_room`: 5/Stunde → 3/Stunde
     - `join_room`: 10/Min → 5/Min

3. **Helmet.js installieren**:
   ```bash
   cd backend
   npm install helmet
   ```
   In `server.js`:
   ```javascript
   import helmet from 'helmet';
   app.use(helmet());
   ```

4. **Profanity Filter**:
   ```bash
   npm install bad-words
   ```

5. **Environment Secrets rotieren**:
   - Render → Settings → Regenerate API Keys (alle 90 Tage)

---

## 💰 KOSTEN (Free Tier Limits)

| Service | Free Limit | Was passiert danach? |
|---------|------------|---------------------|
| **Render Web Service** | 750h/Monat | Service pausiert |
| **Render Redis** | 25 MB | Read-only Mode |
| **Vercel** | Unbegrenzte Deploys | - |
| **Vercel Bandwidth** | 100 GB/Monat | Throttling |

**Für MVP absolut ausreichend!**

Bei Skalierung (>100 concurrent users):
- Render: Upgrade zu $7/Monat (Starter Plan)
- Redis: Upgrade zu $10/Monat (1 GB)

---

## 🚀 QUICK REFERENCE

### URLs nach Deployment

```bash
# Frontend (Vercel)
https://frontend-o4qkp8i61-antiroms-projects.vercel.app

# Backend (Render) - NOCH EINZURICHTEN
https://shoutbox-backend-xyz.onrender.com

# GitHub Repo
https://github.com/antirom-design/shoutbox

# Health-Check
https://shoutbox-backend-xyz.onrender.com/health
```

### Wichtige Commands

```bash
# Lokales Backend starten
cd backend && npm run dev

# Lokales Frontend starten
cd frontend && npm run dev

# Vercel Redeploy
cd frontend && vercel --prod

# Git Push (auto-deploys Render)
git push origin main

# Logs checken
# → Render Dashboard oder Vercel Dashboard
```

---

## 📞 SUPPORT

Bei Problemen:
1. Checke Render/Vercel Logs
2. Browser DevTools Console (F12)
3. GitHub Issues: https://github.com/antirom-design/shoutbox/issues

---

**Happy Deploying! 🎉**

Nach Abschluss hast du:
- ✅ Production-ready Backend mit Redis
- ✅ Globales CDN-Frontend via Vercel
- ✅ Echtzeit-Kommunikation via WebSockets
- ✅ Auto-Deploys via Git Push

**Next Steps**: Teile den Link und spiele das erste Poll-Game! 🎮

# ⚡ QUICKSTART

## Status: Frontend ist LIVE! 🚀

**Frontend (Vercel)**: https://frontend-o4qkp8i61-antiroms-projects.vercel.app

**Backend**: Noch nicht deployed (siehe unten)

---

## 🎯 Was du jetzt machen musst:

### 1️⃣ Backend auf Render deployen (5 Minuten)

Öffne `DEPLOYMENT.md` und folge **nur** dem Abschnitt "BACKEND DEPLOYMENT (Render)".

**Zusammenfassung:**
1. render.com öffnen → New Web Service
2. GitHub Repo `shoutbox` verbinden
3. Root Directory: `backend` setzen
4. Redis Add-on hinzufügen (Free)
5. Environment Variables setzen:
   - `FRONTEND_URL` = `https://frontend-o4qkp8i61-antiroms-projects.vercel.app`
6. Deploy starten
7. **Backend-URL kopieren** (z.B. `https://shoutbox-backend-xyz.onrender.com`)

### 2️⃣ Frontend mit Backend verbinden (2 Minuten)

1. Gehe zu vercel.com → Projekt "frontend" → Settings → Environment Variables
2. Füge hinzu:
   - Key: `VITE_BACKEND_URL`
   - Value: `https://deine-backend-url.onrender.com` (aus Schritt 1)
3. Deployments → Redeploy

### 3️⃣ Testen! 🎮

Öffne: https://frontend-o4qkp8i61-antiroms-projects.vercel.app

1. Name eingeben → Continue
2. Create New Room
3. Neues Inkognito-Fenster → Selben Code joinen
4. Chatten!
5. Start Poll → Beide voten → Ergebnisse nach 30 Sek

---

## 📁 Wichtige Dateien

| Datei | Beschreibung |
|-------|--------------|
| `DEPLOYMENT.md` | Detaillierte Deploy-Anleitung |
| `OVERVIEW.md` | Komplette technische Dokumentation |
| `README.md` | Projekt-Übersicht & Features |
| `backend/server.js` | Gesamte Server-Logik |
| `frontend/src/App.jsx` | Frontend State-Management |

---

## 🔗 Links

- **GitHub**: https://github.com/antirom-design/shoutbox
- **Frontend**: https://frontend-o4qkp8i61-antiroms-projects.vercel.app
- **Backend**: [Nach Render-Deploy hier eintragen]

---

## 💡 Quick Tips

**Lokales Testen:**
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

**Git Push:**
```bash
git add .
git commit -m "Deine Nachricht"
git push
# → Auto-Deploy auf Render!
```

**Logs checken:**
- Render: Dashboard → Logs Tab
- Vercel: Dashboard → Deployments → Klick auf Deployment
- Browser: F12 → Console

---

**Next Step**: Folge `DEPLOYMENT.md` für Backend-Setup! 🚀

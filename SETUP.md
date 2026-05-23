# Polla Mundial 2026 — Guía de Setup

## 1. Google OAuth (5 min)

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un proyecto nuevo (ej. "Polla Mundial 2026")
3. Menú → **APIs & Services → OAuth consent screen**
   - User Type: External → Create
   - App name: "Polla Mundial 2026", email de soporte, email del desarrollador
   - Save and Continue (dejar scopes vacío, dejar test users vacío)
4. Menú → **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Name: "Polla Mundial"
   - Authorized redirect URIs: agrega:
     - `http://localhost:3000/api/auth/google/callback` (desarrollo)
     - `https://TU-APP.railway.app/api/auth/google/callback` (producción)
   - Create → copia el **Client ID** y **Client Secret**

## 2. Railway (deploy en la nube)

1. Ve a [railway.app](https://railway.app) → New Project
2. **Add PostgreSQL** → copia el `DATABASE_URL`
3. **New Service → GitHub Repo** → selecciona este repo
4. En el servicio, ve a **Variables** y agrega:
   ```
   DATABASE_URL=<el de Railway PostgreSQL>
   SESSION_SECRET=una-cadena-larga-y-aleatoria-aqui
   GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-client-secret
   ADMIN_EMAIL=tu-email@gmail.com
   BASE_URL=https://tu-app.railway.app
   CLIENT_URL=https://tu-app.railway.app
   NODE_ENV=production
   ```
5. Railway despliega automáticamente.

## 3. Inicializar la base de datos

Una vez desplegado en Railway, abre la terminal del servicio (o corre localmente con `DATABASE_URL` apuntando a Railway):

```bash
cd backend
npm run db:schema   # Crea las tablas
npm run db:seed     # Carga los 72 partidos de la fase de grupos
```

## 4. Desarrollo local

```bash
# Terminal 1: backend
cd backend
cp .env.example .env   # Edita con tus valores
npm install
npm run db:schema
npm run db:seed
npm run dev

# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

Abre: http://localhost:5173

## Funciones

| Rol | Puede hacer |
|-----|-------------|
| **Admin** (tu email) | Ver y editar todos los partidos, ingresar resultados, marcar en vivo |
| **Jugador** | Login con Google, hacer pronósticos antes de que empiece el partido, ver la tabla |

## Sistema de puntos

- 🎯 **3 puntos** — Marcador exacto (ej. predices 2-1, termina 2-1)
- ✅ **1 punto** — Ganador/empate correcto (ej. predices 2-1, termina 3-0)
- ❌ **0 puntos** — Incorrecto

Los puntos se calculan y publican en tiempo real a todos los dispositivos conectados cuando el admin ingresa un resultado.

## Compartir con amigos

Solo comparte la URL de Railway. Cualquier persona con el link puede entrar con su cuenta de Google y hacer pronósticos.

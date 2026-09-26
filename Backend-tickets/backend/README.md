# Backend — Sistema de Tickets Posgrados UTP (migración desde Apps Script)

Este backend reemplaza `Codigo.gs`. Misma lógica de negocio (SLA, alertas,
envío masivo, respuesta con constancia, dashboard), ahora con:

- Base de datos PostgreSQL real (antes: Google Sheets)
- **Nuevo:** copia (CC) automática en cada correo — Director de Posgrados +
  Vicerrectoría Académica (fijas) + decano de la facultad correspondiente
  (variable, se resuelve solo según cada ticket, incluso en envío masivo).

## 1. Requisitos

- Node.js 20+
- Una cuenta gratis en [Supabase](https://supabase.com) o [Neon](https://neon.tech) (Postgres gratis)
- Una cuenta de correo para enviar los avisos (recomendado: Gmail con "contraseña de aplicación")

## 2. Configuración local

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tu DATABASE_URL (Supabase/Neon), credenciales SMTP y los
# correos de CC_DIRECTOR_POSGRADOS / CC_VICERRECTORIA_ACADEMICA / CC_COORDINADOR

npm run prisma:migrate   # crea las tablas en tu base de datos
npm run seed              # carga tus directores, tipos, asesores y decanos (edita src/seed.ts primero)
npm run dev                # levanta el servidor en http://localhost:3000
```

Prueba que funciona: `curl http://localhost:3000/api/health`

## 3. Cargar tus datos reales (`src/seed.ts`)

Antes de correr `npm run seed`, abre `src/seed.ts` y pega ahí:
- Tus filas actuales de `MAESTRO_DIRECTORES` (facultad, programa, responsable, correo)
- Tus tipos de solicitud de `LISTAS` (tipo, días SLA, mensaje predeterminado)
- Tus asesores
- **Nuevo:** el correo del decano de cada facultad (esto es lo que resuelve
  automáticamente el CC variable que pediste — ya no hace falta elegirlo a mano).

También puedes cargar/editar los decanos después, en caliente, vía:
`POST /api/catalog/decanos { "facultad": "...", "correo": "...", "nombre": "..." }`

## 4. Despliegue gratis (Render + Supabase)

1. **Base de datos**: crea un proyecto en Supabase → Settings → Database →
   copia el "Connection string" (modo *Transaction pooler*) → pégalo en `DATABASE_URL`.
2. **Backend**: sube esta carpeta a un repo de GitHub → entra a
   [render.com](https://render.com) → New → Web Service → conecta el repo →
   - Build command: `npm install && npm run build && npx prisma generate`
   - Start command: `npm start`
   - Agrega todas las variables de tu `.env` en la sección Environment de Render.
   - Corre las migraciones una vez desde tu máquina apuntando al `DATABASE_URL`
     de producción: `npx prisma migrate deploy`.
3. El plan gratis de Render "duerme" el servicio tras ~15 min sin tráfico
   (la primera petición tarda ~30s en despertar). Para que el cron de alertas
   no se pierda, agrega un cron externo gratuito en
   [cron-job.org](https://cron-job.org) que llame una vez al día a:
   `POST https://tu-backend.onrender.com/api/alerts/run`
   con header `x-cron-secret: <tu CRON_SECRET>` — eso también mantiene el
   servicio despierto.

## 5. Endpoints principales

| Método | Ruta | Equivale a |
|---|---|---|
| GET | `/api/tickets` | `obtenerTodosLosTickets()` |
| GET | `/api/tickets/:id` | `obtenerTicketPorId()` |
| POST | `/api/tickets` | `crearSolicitud()` |
| POST | `/api/tickets/masivo` | `envioMasivo()` — ya con CC fijos + decano por facultad |
| POST | `/api/tickets/:id/respuesta` | `procesarRespuesta()` |
| POST | `/api/alerts/run` | `gestionarAlertasSLA()` (protegido, header `x-cron-secret`) |
| GET | `/api/dashboard/metrics` | `obtenerMetricasDashboard()` |
| GET | `/api/catalog/programas` \| `/asesores` \| `/tipos` | catálogos del formulario |
| GET/POST | `/api/catalog/decanos` | **nuevo**: administra el mapeo Facultad → Decano |

## 6. Lo que falta (Fase 2)

- Frontend en Angular (Panel de asesor, Formulario del director, Dashboard) —
  consumirá esta misma API vía HTTP en vez de `google.script.run`.
- El logo de la UTP ya está guardado en `../frontend-assets/logo-utp.png`
  listo para usarse en el header del Angular.
- Autenticación (hoy los endpoints están abiertos): recomendable restringir
  el panel de asesores a cuentas @utp.edu.co antes de desplegar a producción.

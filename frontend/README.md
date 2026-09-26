# Frontend — Sistema de Tickets Posgrados UTP (Angular)

Reemplaza `PanelAsesor.html`, `FormDirector.html` y `Dashboard.html`. Misma
lógica y el mismo diseño visual, pero como app Angular que consume el
backend Node (Fase 1) por HTTP en vez de `google.script.run`.

## Rutas

| Ruta | Reemplaza a |
|---|---|
| `/panel` | `?view=panel` (por defecto) — tabla de tickets, nueva solicitud, envío masivo |
| `/dashboard` | `?view=dashboard` — KPIs y gráficas |
| `/responder/:id` | `?view=responder&id=...` — formulario que abre el director desde el correo |

## 1. Configurar la URL del backend

Antes de nada, edita **dos** archivos con la URL de tu backend (el que ya
desplegaste en Render en la Fase 1):

- `src/environments/environment.ts` → para desarrollo local (`http://localhost:3000/api` si corres el backend en tu máquina).
- `src/environments/environment.prod.ts` → para producción, ej:
  ```ts
  export const environment = {
    production: true,
    apiUrl: 'https://tu-backend.onrender.com/api',
  };
  ```

## 2. Desarrollo local

```bash
npm install
npm start
```
Abre `http://localhost:4200`. Asegúrate de tener el backend corriendo en paralelo (`npm run dev` en la carpeta `backend`).

## 3. Build de producción

```bash
npm run build
```
Esto genera `dist/frontend/browser` — es esa carpeta la que subes a Vercel/Netlify (no `dist/frontend` completo).

## 4. Despliegue gratis (Vercel)

1. Sube esta carpeta a un repo de GitHub (puede ser el mismo del backend, en una subcarpeta `frontend/`, o uno aparte).
2. Entra a [vercel.com](https://vercel.com) → **Add New → Project** → conecta el repo.
3. Framework preset: **Angular** (Vercel lo detecta solo). Si pregunta por el "Output Directory", ponlo manual: `dist/frontend/browser`.
4. Deploy. Te da una URL tipo `https://tu-proyecto.vercel.app`.

**Alternativa (Netlify):** mismo build command (`npm run build`), publish directory `dist/frontend/browser`.

## 5. Último paso — conectar todo

Una vez tengas la URL real del frontend desplegado:

1. Actualiza `FRONTEND_URL` en las variables de entorno de tu **backend** en Render, con esa URL (así el botón "Responder esta solicitud" en los correos apunta al sitio correcto).
2. Verifica que `environment.prod.ts` tenga la URL real del **backend**, y vuelve a desplegar el frontend si la cambiaste después del primer deploy.

## Qué falta (pendiente, opcional)

- Autenticación: hoy cualquiera con la URL de `/panel` puede ver y crear tickets. Antes de compartirla ampliamente, conviene restringir el acceso (login con Google restringido a @utp.edu.co es lo más simple de agregar).
- El logo de la UTP ya está en `public/assets/logo-utp.png` e integrado en el header de Panel/Dashboard/Responder.

# Despliegue GymVerse

GymVerse se despliega como tres servicios:

- API en Render: `apps/api`.
- PWA cliente en Netlify: `apps/customer`.
- Panel admin en Netlify: `apps/admin`.

## 1. Preparar GitHub

1. Crea un repositorio privado o publico en GitHub.
2. Sube este proyecto completo.
3. Confirma que GitHub Actions ejecute `GymVerse CI`.

El workflow valida:

- Build de API, cliente y admin.
- Auditoria interna de seguridad.
- Vulnerabilidades de dependencias de produccion.

## 2. API en Render

Puedes crear el servicio desde `render.yaml` o manualmente.

Configuracion esperada:

- Runtime: Node.
- Build command: `npm install`.
- Start command: `npm run start -w apps/api`.
- Health check: `/health`.
- Node: `20`.

Variables de entorno requeridas:

- `NODE_ENV=production`
- `MONGODB_URI`
- `MONGODB_DB=gymverse`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=7d`
- `DATA_ENCRYPTION_KEY`
- `CLIENT_ORIGIN`
- `ADMIN_ORIGIN`
- `AUTH_RATE_LIMIT_WINDOW_MS=900000`
- `AUTH_RATE_LIMIT_MAX=12`
- `GOOGLE_CLIENT_ID`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Webhook de Mercado Pago:

```text
https://TU-API-RENDER.onrender.com/api/orders/mercado-pago/webhook
```

## 3. Cliente en Netlify

Crea un sitio en Netlify usando como base:

```text
apps/customer
```

Netlify leera `apps/customer/netlify.toml`.

Variable requerida:

```text
VITE_API_URL=https://TU-API-RENDER.onrender.com/api
```

## 4. Admin en Netlify

Crea otro sitio en Netlify usando como base:

```text
apps/admin
```

Netlify leera `apps/admin/netlify.toml`.

Variable requerida:

```text
VITE_API_URL=https://TU-API-RENDER.onrender.com/api
```

El admin esta configurado con `noindex` para no aparecer en buscadores.

## 5. Variables cruzadas

Cuando Netlify entregue las URLs finales:

- En Render, define `CLIENT_ORIGIN` con la URL publica de la PWA.
- En Render, define `ADMIN_ORIGIN` con la URL publica del admin.
- En Mercado Pago, usa el webhook publico de Render.

## 6. Checklist final

Antes de publicar:

```bash
npm run check
npm run audit
npm audit --omit=dev
```

En Render revisa:

- `/health` responde `status: ok`.
- MongoDB conecta correctamente.
- `MERCADO_PAGO_WEBHOOK_URL` incluye `/api/orders/mercado-pago/webhook`.
- Cloudinary esta configurado para subir imagenes sin guardarlas en disco local.

En Netlify revisa:

- Cliente abre y consume catalogo.
- Admin abre y permite iniciar sesion.
- Ambas apps usan `https`.

Seguridad:

- Regenera el access token de Mercado Pago si fue compartido durante pruebas.
- Usa secretos largos para `JWT_SECRET` y `DATA_ENCRYPTION_KEY`.
- No subas `.env` al repositorio.

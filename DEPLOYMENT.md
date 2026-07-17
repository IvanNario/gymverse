# Despliegue GymVerse en Vercel

GymVerse se despliega como tres proyectos separados en Vercel:

- API serverless: `apps/api`.
- PWA cliente: `apps/customer`.
- Panel admin: `apps/admin`.

## 1. Preparar GitHub

1. Sube el proyecto completo al repositorio de GitHub.
2. Confirma que GitHub Actions ejecute `GymVerse CI`.

El workflow valida:

- Build de API, cliente y admin.
- Auditoria interna de seguridad.
- Vulnerabilidades de dependencias de produccion.

## 2. API en Vercel

Crea un proyecto de Vercel conectado al repo:

- Root Directory: `apps/api`
- Framework Preset: `Other`
- Build Command: vacio
- Output Directory: vacio
- Install Command: `npm install`

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
https://TU-API-VERCEL.vercel.app/api/orders/mercado-pago/webhook
```

## 3. Cliente en Vercel

Crea otro proyecto de Vercel:

- Root Directory: `apps/customer`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Variable requerida:

```text
VITE_API_URL=https://TU-API-VERCEL.vercel.app/api
```

## 4. Admin en Vercel

Crea otro proyecto de Vercel:

- Root Directory: `apps/admin`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Variable requerida:

```text
VITE_API_URL=https://TU-API-VERCEL.vercel.app/api
```

El admin esta configurado con `noindex` para no aparecer en buscadores.

## 5. Variables cruzadas

Cuando Vercel entregue las URLs finales:

- En el proyecto API, define `CLIENT_ORIGIN` con la URL publica de la PWA.
- En el proyecto API, define `ADMIN_ORIGIN` con la URL publica del admin.
- En Mercado Pago, usa el webhook publico del proyecto API.
- En Google Cloud, agrega la URL publica del cliente en Authorized JavaScript origins.

## 6. Checklist final

Antes de publicar:

```bash
npm run check
npm run audit
npm audit --omit=dev
```

En Vercel revisa:

- `/health` responde `status: ok`.
- MongoDB conecta correctamente.
- `MERCADO_PAGO_WEBHOOK_URL` incluye `/api/orders/mercado-pago/webhook`.
- Cloudinary esta configurado para subir imagenes sin guardarlas en disco local.
- Cliente abre y consume catalogo.
- Admin abre y permite iniciar sesion.
- Las tres apps usan `https`.

Seguridad:

- Regenera el access token de Mercado Pago si fue compartido durante pruebas.
- Usa secretos largos para `JWT_SECRET` y `DATA_ENCRYPTION_KEY`.
- No subas `.env` al repositorio.

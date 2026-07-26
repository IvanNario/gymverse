# Requerimientos Técnicos - GymVerse

## 1. Descripción técnica

GymVerse es un monorepo con tres aplicaciones:

- `apps/api`: API REST con Express y MongoDB.
- `apps/customer`: PWA para clientes.
- `apps/admin`: panel administrativo.

La API centraliza autenticación, permisos, reglas de negocio, pagos, notificaciones, soporte, inventario, reportes, PDFs, auditoría y automatizaciones.

## 2. Tecnologías

| Componente | Tecnología |
|---|---|
| Cliente | React 18 + Vite |
| Admin | React 18 + Vite |
| API | Node.js 20.19+ + Express 5 |
| Base de datos | MongoDB |
| ODM | Mongoose |
| Autenticación | JWT |
| Contraseñas | bcryptjs |
| Seguridad HTTP | Helmet |
| CORS | cors |
| Logs | morgan |
| Pagos | Mercado Pago Checkout Pro |
| Imágenes | Cloudinary |
| Correo transaccional | Resend opcional |
| Iconos | lucide-react |
| PWA | Manifest + Service Worker |

## 3. Estructura

```text
GymVerse/
  apps/
    api/
      src/
        config/
        middleware/
        models/
        routes/
        utils/
      scripts/
    customer/
      src/
        components/
        pages/
        services/
      public/
    admin/
      src/
        components/
        pages/
        services/
      public/
  documentacion/
  assets/
  DEPLOYMENT.md
  package.json
```

## 4. Puertos locales

| Servicio | URL |
|---|---|
| API | http://localhost:4000 |
| Cliente | http://localhost:5175 |
| Admin | http://localhost:5174 |

## 5. Scripts

| Comando | Uso |
|---|---|
| `npm install` | Instala dependencias. |
| `npm run dev` | Inicia API, cliente y admin. |
| `npm run dev:api` | Inicia solo la API. |
| `npm run dev:customer` | Inicia solo cliente. |
| `npm run dev:admin` | Inicia solo admin. |
| `npm run doctor` | Revisa configuración de API. |
| `npm run seed` | Carga datos iniciales. |
| `npm run audit` | Ejecuta auditoría interna. |
| `npm run check` | Valida API y builds. |
| `npm run build` | Construye cliente y admin. |

## 6. Variables de entorno

| Variable | Descripción |
|---|---|
| `NODE_ENV` | Entorno de ejecución. |
| `PORT` | Puerto de API. |
| `MONGODB_URI` | URI de MongoDB. |
| `MONGODB_DB` | Base de datos. |
| `JWT_SECRET` | Firma de tokens JWT. |
| `JWT_EXPIRES_IN` | Duración del token. |
| `DATA_ENCRYPTION_KEY` | Llave para datos sensibles cifrados. |
| `CLIENT_ORIGIN` | URL pública del cliente. |
| `ADMIN_ORIGIN` | URL pública del admin. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Ventana del rate limit de auth. |
| `AUTH_RATE_LIMIT_MAX` | Intentos máximos de auth. |
| `EMAIL_FROM` | Remitente para correos transaccionales. |
| `RESEND_API_KEY` | API key opcional para enviar códigos de recuperación. |
| `GOOGLE_CLIENT_ID` | Cliente OAuth para validar Google Login en API. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de Mercado Pago. |
| `MERCADO_PAGO_WEBHOOK_URL` | Webhook público de Mercado Pago. |
| `CLOUDINARY_CLOUD_NAME` | Cuenta Cloudinary para imágenes. |
| `CLOUDINARY_API_KEY` | API key de Cloudinary. |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary. |
| `VITE_API_URL` | URL de API usada por cliente/admin en Vercel. |

## 7. Seguridad técnica

- JWT para sesión.
- Rate limit en login, registro, Google Login y recuperación de contraseña.
- Helmet para cabeceras HTTP.
- CORS restringido a cliente y admin.
- Sanitización de payloads peligrosos.
- Cifrado de datos sensibles con `DATA_ENCRYPTION_KEY`.
- Redacción de datos sensibles en logs.
- Auditoría de acciones internas.
- Healthcheck en `/health`.
- Manejo consistente de 404, errores de validación, duplicados y errores internos.

## 8. Integración de pagos

El checkout en línea usa Mercado Pago Checkout Pro.

**Flujo:**

1. Cliente crea pedido con método `mercado_pago`.
2. API reserva stock y crea preferencia.
3. Cliente se redirige a Mercado Pago.
4. Mercado Pago notifica al webhook.
5. API sincroniza pago y actualiza pedido.

**Webhook:**

```text
https://TU-API-VERCEL.vercel.app/api/orders/mercado-pago/webhook
```

## 9. Despliegue

| Componente | Plataforma |
|---|---|
| API | Vercel |
| Cliente | Vercel |
| Admin | Vercel |

El despliegue recomendado usa tres proyectos de Vercel conectados al mismo repositorio: API serverless, PWA cliente y panel admin.

## 10. Checklist producción

- Node 20.19 o superior compatible.
- MongoDB disponible.
- `JWT_SECRET` seguro.
- `DATA_ENCRYPTION_KEY` de al menos 32 caracteres.
- `CLIENT_ORIGIN` y `ADMIN_ORIGIN` reales.
- Mercado Pago configurado.
- Cloudinary configurado para imágenes subidas.
- Google Login configurado si se mostrará en producción.
- Resend configurado si se usará recuperación real por correo.
- Ejecutar `npm run check`.
- Ejecutar `npm run audit`.
- Ejecutar `npm audit --omit=dev`.
- Verificar `/health`.
- Usar HTTPS.

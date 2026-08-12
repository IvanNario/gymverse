# Requerimientos Técnicos - GymVerse

**Fecha de actualización:** 26 de julio de 2026

## 1. Descripción técnica

GymVerse es un monorepo con tres aplicaciones:

- API backend en Express y MongoDB.
- PWA de cliente en React y Vite.
- Panel administrativo en React y Vite.

El despliegue actual documentado se realiza en Vercel como tres proyectos independientes: API, cliente y admin.

## 2. Estructura principal del proyecto

| Ruta | Propósito |
|---|---|
| apps/api | API REST, modelos, rutas, seguridad e integraciones. |
| apps/api/src/app.js | Aplicación Express principal. |
| apps/api/api/index.js | Entrada serverless para Vercel. |
| apps/customer | PWA para clientes. |
| apps/admin | Panel administrativo y portal de gimnasio. |
| scripts | Utilidades de diagnóstico, seed y auditoría. |
| documentacion | Documentación funcional y técnica. |

## 3. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend cliente | React, Vite, PWA, Lucide React. |
| Frontend admin | React, Vite, Lucide React. |
| Backend | Node.js, Express. |
| Base de datos | MongoDB Atlas o MongoDB compatible. |
| ODM | Mongoose. |
| Autenticación | JWT, bcryptjs, Google Login. |
| Pagos | Mercado Pago Checkout Pro y webhook. |
| Email | Resend para recuperación de contraseña. |
| Imágenes | Cloudinary para carga externa de imágenes. |
| PDFs | PDFKit en API para guías y reportes. |
| Despliegue | Vercel para API, cliente y admin. |

## 4. Versiones mínimas

| Herramienta | Requerimiento |
|---|---|
| Node.js | 20.19.0 o superior. |
| npm | Compatible con Node 20. |
| MongoDB | Servicio MongoDB accesible por URI. |

## 5. Variables de entorno de API

| Variable | Obligatoria | Descripción |
|---|---|---|
| NODE_VERSION | Sí en Vercel | Debe ser 20.19.0 o superior. |
| NODE_ENV | Sí | production en producción. |
| MONGODB_URI | Sí | URI de conexión a MongoDB. |
| MONGODB_DB | Sí | Nombre de base de datos, recomendado gymverse. |
| JWT_SECRET | Sí | Secreto para firmar tokens. En producción no puede ser el valor dev. |
| JWT_EXPIRES_IN | Recomendado | Vigencia del token, por defecto 7d. |
| DATA_ENCRYPTION_KEY | Sí | Llave para cifrar datos sensibles. En producción debe tener mínimo 32 caracteres. |
| CLIENT_ORIGIN | Sí | URL pública de la app cliente. |
| ADMIN_ORIGIN | Sí | URL pública del panel admin. |
| AUTH_RATE_LIMIT_WINDOW_MS | Recomendado | Ventana del rate limit de autenticación. |
| AUTH_RATE_LIMIT_MAX | Recomendado | Máximo de intentos por ventana. |
| EMAIL_FROM | Recomendado | Remitente de correos transaccionales. |
| RESEND_API_KEY | Recomendado | API key para enviar códigos de recuperación. |
| GOOGLE_CLIENT_ID | Recomendado | Cliente OAuth de Google Login. |
| MERCADO_PAGO_ACCESS_TOKEN | Según pagos | Token de Mercado Pago. |
| MERCADO_PAGO_WEBHOOK_URL | Según pagos | URL pública del webhook. |
| CLOUDINARY_CLOUD_NAME | Sí para uploads | Cloudinary cloud name. |
| CLOUDINARY_API_KEY | Sí para uploads | API key de Cloudinary. |
| CLOUDINARY_API_SECRET | Sí para uploads | API secret de Cloudinary. |

## 6. Variables de entorno de cliente y admin

| Variable | Aplicación | Descripción |
|---|---|---|
| VITE_API_URL | Cliente y admin | URL base de API, por ejemplo https://api.tudominio.com/api. |
| VITE_GOOGLE_CLIENT_ID | Cliente | Opcional; si no existe, el cliente consulta /auth/google-config. |

## 7. Despliegue en Vercel

### API

- Root Directory: apps/api.
- Build Command: vacío.
- Output Directory: vacío.
- Install Command: npm install.
- Entrada serverless: apps/api/api/index.js.
- Endpoint de salud: /health.

### Cliente

- Root Directory: apps/customer.
- Framework Preset: Vite.
- Build Command: npm run build.
- Output Directory: dist.
- Variable principal: VITE_API_URL.

### Admin

- Root Directory: apps/admin.
- Framework Preset: Vite.
- Build Command: npm run build.
- Output Directory: dist.
- Variable principal: VITE_API_URL.

## 8. Integraciones externas

### Mercado Pago

Se usa para Checkout Pro. Los pedidos pagados con Mercado Pago se crean como pending_payment y pueden actualizarse mediante webhook o refresco de pago.

Webhook esperado:

```text
/api/orders/mercado-pago/webhook
```

### Google Login

Permite registro e inicio de sesión de clientes. La API valida el token de Google con GOOGLE_CLIENT_ID.

### Resend

Envía códigos de recuperación de contraseña. Si no está configurado en desarrollo, la API puede registrar el código en entorno no productivo.

### Cloudinary

Almacena imágenes subidas desde el panel administrativo. Las imágenes no se guardan en disco local.

## 9. Seguridad técnica

- CORS limitado a CLIENT_ORIGIN y ADMIN_ORIGIN.
- Helmet activo.
- JSON limitado a 8 MB.
- Rechazo de payloads inseguros como operadores peligrosos.
- Rate limit en login, registro, Google Login y recuperación de contraseña.
- JWT para rutas privadas.
- Roles customer, admin, staff y gym.
- Permisos por módulo para staff.
- Hash de contraseñas con bcryptjs.
- Datos sensibles cifrados con DATA_ENCRYPTION_KEY.
- Auditoría en acciones internas relevantes.

## 10. Comandos útiles

| Comando | Descripción |
|---|---|
| npm run dev | Levanta API, cliente y admin en desarrollo. |
| npm run dev:api | Levanta solo API. |
| npm run dev:customer | Levanta solo cliente. |
| npm run dev:admin | Levanta solo admin. |
| npm run build | Construye cliente y admin. |
| npm run check | Ejecuta validaciones del proyecto. |
| npm run doctor | Revisa configuración base. |
| npm run seed | Carga datos iniciales. |
| npm audit | Revisa vulnerabilidades de dependencias. |

## 11. Requerimientos para producción

- MongoDB accesible desde Vercel.
- Orígenes configurados correctamente.
- JWT_SECRET y DATA_ENCRYPTION_KEY robustos.
- Mercado Pago configurado si se aceptan pagos en línea.
- Webhook público de Mercado Pago apuntando a la API.
- Cloudinary configurado para imágenes.
- Resend configurado para recuperación de contraseña.
- Google OAuth configurado con el origen público del cliente.

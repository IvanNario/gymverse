# GymVerse Platform

Repositorio de la App y Administrador GymVerse.

Plataforma separada para GymVerse con:

- `apps/api`: API con Express y MongoDB.
- `apps/customer`: PWA de clientes para tienda, carrito, checkout y pedidos.
- `apps/admin`: panel administrativo para ventas, inventario, gimnasios y proveedores.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Ajusta `MONGODB_URI` si usaras MongoDB Atlas o una instancia local distinta.
   - Si Atlas con `mongodb+srv://` falla por DNS, usa la cadena standard `mongodb://...` que aparece en Atlas Connect.
   - En Atlas agrega tu IP en `Network Access`.
   - Si tu URI no incluye nombre de base, usa `MONGODB_DB=gymverse`.
   - Usa un usuario de `Database Access`, no tu usuario de inicio de sesion de Atlas.
   - Si el password tiene caracteres especiales, codificalo para URL antes de ponerlo en `MONGODB_URI`.
3. Instala dependencias:

```bash
npm install
```

4. Carga datos iniciales:

```bash
npm run doctor
npm run seed
```

Usuarios de prueba:

- Admin: `admin@gymverse.mx` / `GymVerse123`
- Cliente: `cliente@gymverse.mx` / `GymVerse123`

## Desarrollo

```bash
npm run dev
```

Servicios:

- API: `http://localhost:4000`
- Cliente: `http://localhost:5175`
- Admin: `http://localhost:5174`

## Pagos reales

El checkout de clientes usa Mercado Pago Checkout Pro.

Variables necesarias:

- `MERCADO_PAGO_ACCESS_TOKEN`: access token de Mercado Pago.
- `MERCADO_PAGO_WEBHOOK_URL`: URL publica del webhook, por ejemplo `https://api.tudominio.com/api/orders/mercado-pago/webhook`.
- `CLIENT_ORIGIN`: dominio publico del cliente para los retornos del checkout.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: almacenamiento externo para imagenes subidas.

Notas:

- En desarrollo puedes crear pedidos con el token de prueba de Mercado Pago.
- Para probar retornos y webhooks reales, usa URLs publicas. Mercado Pago no puede volver correctamente a `localhost` desde un pago real.
- El pedido queda como `Pendiente de pago`, se redirige al checkout de Mercado Pago y luego se sincroniza por webhook o al volver al sitio.
- El cliente ya no guarda tarjetas dentro de GymVerse; Mercado Pago procesa los medios de pago.

## Automatizaciones

El panel admin incluye una seccion de automatizaciones para ejecutar reglas operativas:

- Pausar promociones vencidas.
- Detectar stock bajo y avisar al equipo admin.
- Enviar recordatorios a clientes con pagos de Mercado Pago pendientes.
- Marcar afiliaciones de gimnasios con pago vencido.

Cada ejecucion queda registrada con hallazgos, cambios y usuario que la disparo.

## Contenido fitness

GymVerse incluye un modulo de guias fitness:

- Admin puede crear, editar, publicar y archivar guias.
- Las guias se clasifican por entrenamiento, nutricion, recuperacion y habitos.
- Cada guia puede tener nivel, tiempo de lectura, tags y productos relacionados.
- El cliente puede leerlas desde la PWA en la seccion `Guias`.

## Modulos

- Autenticacion con roles `customer`, `admin` y `gym`.
- Catalogo con categorias, proveedores, productos y variantes.
- Contenido fitness conectado con productos relacionados.
- Inventario por variante.
- Pedidos con entrega a domicilio o retiro en gimnasios afiliados.
- Pagos reales con Mercado Pago y pago al recoger para retiros.
- Automatizaciones admin con historial de ejecucion.
- Administracion de estadisticas, inventario, pedidos, gimnasios y proveedores.
- PWA de cliente con manifest y service worker.

## Seguridad y produccion

Antes de desplegar:

- Copia `.env.example` a `.env` y configura un `JWT_SECRET` largo y aleatorio.
- Usa `NODE_ENV=production`.
- Define `CLIENT_ORIGIN` y `ADMIN_ORIGIN` con los dominios reales.
- Configura `MERCADO_PAGO_ACCESS_TOKEN` y `MERCADO_PAGO_WEBHOOK_URL`.
- Configura Cloudinary; las imagenes subidas no se guardan en local.
- Revisa `DEPLOYMENT.md` para desplegar API, cliente y admin en Vercel.
- Ejecuta:

```bash
npm run doctor
npm run audit
npm run check
```

La API incluye:

- Rate limit basico en login y registro.
- Healthcheck en `/health` con estado de base de datos.
- Validacion de pedidos, cupones, accesos de gimnasio y reseñas.
- Manejo consistente de rutas inexistentes, IDs invalidos, duplicados y errores internos.

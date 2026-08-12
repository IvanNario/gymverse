# Manual de Usuario - GymVerse

**Fecha de actualización:** 26 de julio de 2026

## 1. Introducción

GymVerse es una aplicación fitness formada por tres partes: una PWA para clientes, un panel administrativo y una API central. La plataforma permite comprar productos fitness, pagar con Mercado Pago o al recoger, retirar pedidos en gimnasios afiliados, solicitar devoluciones, recibir notificaciones, consultar contenido, crear tickets de soporte y canjear recompensas por puntos.

El sistema también incluye un portal para gimnasios afiliados, desde donde cada gimnasio puede administrar pedidos de retiro, confirmar entregas con código y solicitar reabastecimiento de stock local.

## 2. Roles del sistema

| Rol | Descripción | Acceso principal |
|---|---|---|
| Cliente | Usuario final que compra, guarda favoritos, afilia gimnasios y canjea puntos. | PWA cliente. |
| Admin | Usuario con control total del panel y gestión de usuarios internos. | Panel administrativo completo. |
| Staff | Usuario interno con permisos específicos por módulo. | Panel administrativo según permisos. |
| Gym | Usuario vinculado a un gimnasio afiliado. | Portal de gimnasio. |

## 3. App Cliente

### 3.1 Registro

El cliente puede crear una cuenta usando formulario tradicional o Google Login cuando está configurado.

**Campos del registro tradicional:**

- Nombre completo.
- Correo electrónico.
- Teléfono.
- Contraseña.
- Confirmación de contraseña.

**Validaciones principales:**

- Nombre obligatorio con mínimo 3 caracteres.
- Correo obligatorio con formato válido y no registrado previamente.
- Teléfono obligatorio con formato válido.
- Contraseña mínima de 8 caracteres, con letras y números.
- Confirmación de contraseña igual a la contraseña.

### 3.2 Inicio de sesión

El cliente inicia sesión con correo y contraseña, o con Google Login si el servicio está activo.

**Validaciones principales:**

- Correo con formato válido.
- Contraseña presente.
- Cuenta activa.
- Google Login solo permite acceso a cuentas de cliente; cuentas admin, staff o gym no entran por esta vista.
- Si las credenciales no coinciden, se muestra error de acceso.

### 3.3 Recuperación de contraseña

La vista de recuperación permite solicitar un código por correo y definir una nueva contraseña.

**Flujo:**

1. El usuario escribe su correo.
2. GymVerse genera un código de 6 dígitos con vencimiento.
3. El usuario captura el código y la nueva contraseña.
4. Si el código es correcto, se actualiza la contraseña y se inicia sesión.

**Validaciones principales:**

- Correo obligatorio y válido.
- Código numérico de 6 dígitos.
- Código vigente.
- Máximo de intentos por código.
- Nueva contraseña con mínimo 8 caracteres, letras y números.

### 3.4 Tienda

La tienda muestra productos activos, categorías, promociones publicadas y accesos a recompensas.

**Funciones:**

- Buscar productos por texto.
- Filtrar por categoría.
- Ver promociones activas.
- Aplicar un cupón sugerido.
- Abrir detalle de producto.
- Agregar productos al carrito.
- Consultar favoritos.

### 3.5 Detalle de producto

La vista de producto muestra información completa de un producto y sus variantes.

**Funciones:**

- Ver imagen, nombre, descripción, categoría, precio, variantes y stock.
- Marcar o quitar favorito.
- Consultar reseñas.
- Publicar reseña.
- Agregar variante al carrito.

**Validaciones principales:**

- Solo se muestran productos activos.
- No se puede agregar una variante sin stock.
- La reseña requiere calificación de 1 a 5 y comentario descriptivo.
- Solo existe una reseña por cliente y producto; si el cliente vuelve a opinar, se actualiza.

### 3.6 Carrito

El carrito permite revisar productos, modificar cantidades, aplicar cupones y confirmar la compra.

**Funciones:**

- Aumentar o disminuir cantidades.
- Eliminar productos.
- Elegir entrega en gimnasio afiliado o entrega a domicilio.
- Elegir Mercado Pago o pago al recoger.
- Aplicar y quitar cupones.
- Ver resumen de subtotal, envío, descuento y total.

**Reglas importantes:**

- Para retiro en gimnasio, el cliente debe tener al menos un gimnasio afiliado en su perfil.
- El stock usado para retiro es el stock local del gimnasio seleccionado.
- Para entrega a domicilio, el stock usado es el inventario central del producto.
- El pago al recoger solo está disponible cuando la entrega es por retiro en gimnasio.
- En entrega a domicilio se puede usar un domicilio guardado o capturar uno para esa compra.
- El cliente puede guardar el domicilio capturado durante el checkout.

### 3.7 Perfil

La sección Perfil concentra la información personal, domicilio, seguridad y gimnasios afiliados.

**Pestañas principales:**

- Resumen: datos generales, puntos y accesos rápidos.
- Cuenta: edición de nombre y teléfono.
- Domicilio: dirección principal de entrega.
- Seguridad: cambio de contraseña.
- Gimnasios: búsqueda, afiliación y baja de gimnasios.

**Validaciones principales:**

- El correo no se edita desde perfil.
- Nombre mínimo de 3 caracteres.
- Teléfono con formato válido.
- Domicilio con etiqueta, teléfono, calle, ciudad, estado y código postal.
- Código postal con mínimo 4 dígitos.
- Cambio de contraseña requiere contraseña actual, contraseña nueva válida y confirmación.
- Para afiliar un gimnasio, debe estar activo y permitir retiro.

### 3.8 Gimnasios afiliados del cliente

El cliente busca gimnasios por nombre, código, ciudad o dirección y los afilia a su cuenta.

**Funciones:**

- Buscar gimnasios con al menos 2 caracteres.
- Afiliar un gimnasio.
- Quitar un gimnasio afiliado.
- Usar los gimnasios afiliados como puntos de retiro.

**Reglas:**

- El carrito solo muestra como puntos de retiro los gimnasios afiliados del cliente.
- Si el cliente quita un gimnasio, ya no aparece para nuevas compras.
- La afiliación no afecta pedidos ya creados.

### 3.9 Pedidos

La vista de pedidos permite consultar historial, estado, pagos, devoluciones y códigos de retiro.

**Estados operativos:**

- pending_payment: pendiente de pago.
- paid: pagado.
- preparing: en preparación.
- ready_for_pickup: listo para recoger.
- shipped: enviado.
- delivered: entregado.
- cancelled: cancelado.

**Funciones:**

- Ver detalle del pedido.
- Continuar pago pendiente de Mercado Pago.
- Cancelar pedidos permitidos.
- Ver código de retiro cuando aplica.
- Solicitar devolución en pedidos entregados.
- Ocultar pedidos del historial del cliente.

### 3.10 Recompensas

El cliente acumula puntos por compras entregadas y puede canjear recompensas activas.

**Validaciones principales:**

- El cliente debe tener puntos suficientes.
- La recompensa debe estar activa y vigente.
- La variante debe tener stock.
- Si el canje es a domicilio, se requiere dirección.
- Si el canje es pickup, se requiere gimnasio de retiro.

### 3.11 Notificaciones

La app muestra avisos del sistema, pedidos, recompensas, soporte y promociones.

**Funciones:**

- Ver notificaciones.
- Marcar como leídas.
- Limpiar notificaciones visibles.
- Consultar contador de no leídas.

### 3.12 Soporte

El cliente puede crear tickets de soporte y consultar sus respuestas.

**Funciones:**

- Crear ticket con categoría, asunto y mensaje.
- Ver estado del ticket.
- Revisar respuesta administrativa.

### 3.13 Legal y contenido

GymVerse incluye documentos legales publicados y contenido fitness.

**Contenido:**

- Términos y condiciones.
- Política de privacidad.
- Política de pagos.
- Política de devoluciones.
- Guías fitness de entrenamiento, nutrición, recuperación y hábitos.

## 4. Panel Administrativo

### 4.1 Login administrativo

Admin, staff y gym entran por el panel administrativo con correo y contraseña.

**Validaciones:**

- Credenciales válidas.
- Cuenta activa.
- Rol permitido.
- Registro de auditoría en accesos internos.

### 4.2 Resumen

Muestra métricas operativas: ventas, pedidos, inventario, reabastecimiento y actividad reciente.

### 4.3 Pedidos

Permite gestionar pedidos de clientes.

**Funciones:**

- Ver pedidos activos.
- Actualizar estado.
- Actualizar pago.
- Confirmar entrega con código de retiro.
- Descargar guía de envío PDF.
- Archivar y desarchivar pedidos cancelados.

### 4.4 Inventario

Administra productos, categorías, variantes, precios, costos, stock e imágenes.

**Funciones:**

- Crear y editar productos.
- Crear y editar categorías.
- Gestionar variantes.
- Registrar entradas de stock.
- Subir imágenes de producto a Cloudinary.
- Consultar inventario central.

### 4.5 Reabastecimiento

Gestiona entradas de inventario central y solicitudes de stock local de gimnasios.

**Funciones:**

- Registrar movimientos de stock.
- Generar guías PDF de reabastecimiento.
- Consultar historial.
- Ver solicitudes de gimnasios.
- Confirmar o cancelar solicitudes de reabastecimiento.

### 4.6 Gimnasios

Administra gimnasios afiliados.

**Funciones:**

- Crear y editar gimnasios.
- Activar, pausar o archivar gimnasios.
- Configurar si permiten retiro.
- Gestionar cuota mensual y estado de pago.
- Crear o actualizar acceso del usuario tipo gym.

### 4.7 Portal de gimnasio

El usuario de gimnasio gestiona únicamente su operación.

**Funciones:**

- Ver resumen del gimnasio.
- Consultar pedidos asignados a su gimnasio.
- Cambiar estados permitidos.
- Confirmar entrega con código.
- Consultar stock local.
- Solicitar reabastecimiento.

**Reglas:**

- El gimnasio solo ve pedidos vinculados a su gimnasio.
- No puede entregar sin código de retiro válido.
- Puede solicitar máximo 20 líneas por solicitud.
- Cada línea solicita de 1 a 10 piezas.
- El stock local por SKU no puede superar 10 piezas.

### 4.8 Cupones y promociones

Gestiona descuentos y campañas.

**Funciones:**

- Crear cupones porcentuales, fijos o de envío gratis.
- Definir compra mínima, vigencia, límite de uso y tope de descuento.
- Activar o desactivar cupones.

### 4.9 Recompensas

Administra drops de recompensas y órdenes de canje.

**Funciones:**

- Crear recompensas.
- Definir costo en puntos, vigencia y stock.
- Gestionar órdenes de recompensa.
- Descargar guías PDF cuando aplique.

### 4.10 Contenido, legal, soporte y notificaciones

**Contenido:** crear, publicar, archivar y restaurar publicaciones.

**Legal:** publicar documentos legales versionados.

**Soporte:** atender tickets y responder solicitudes.

**Notificaciones:** enviar avisos por audiencia.

### 4.11 Finanzas, reportes y auditoría

**Finanzas:** ingresos, pedidos, recompensas, membresías y reabastecimiento.

**Reportes:** descarga de reportes PDF y CSV.

**Auditoría:** bitácora de acciones internas relevantes.

# Manual de Usuario - GymVerse

## 1. Introducción

GymVerse es una plataforma fitness compuesta por una PWA para clientes, un panel administrativo y una API central. La app permite comprar productos, usar cupones, pagar con Mercado Pago o al recoger, consultar pedidos, solicitar devoluciones, recibir avisos, leer guías fitness, gestionar perfil, pedir soporte y canjear recompensas.

## 2. Roles del sistema

| Rol | Descripción | Acceso principal |
|---|---|---|
| Cliente | Usuario final que compra, canjea puntos y solicita soporte. | PWA cliente. |
| Admin | Usuario con acceso total al panel. | Todo el panel administrativo. |
| Staff | Usuario interno con permisos por módulo. | Módulos asignados. |
| Gym | Usuario asociado a un gimnasio afiliado. | Portal de retiro de pedidos. |

## 3. App Cliente

### 3.1 Registro

El cliente crea una cuenta con nombre, correo y contraseña.

**Validaciones:**

- Nombre, correo y contraseña son obligatorios.
- El correo debe tener formato válido.
- La contraseña debe tener al menos 8 caracteres.
- El correo no puede estar registrado previamente.

### 3.2 Inicio de sesión

El cliente inicia sesión con correo y contraseña.

**Validaciones:**

- El correo debe tener formato válido.
- La contraseña no puede estar vacía.
- La cuenta no debe estar desactivada.
- Si los datos no coinciden, se muestra "Credenciales inválidas".

### 3.3 Tienda

La tienda muestra catálogo, promociones, productos favoritos y recompensas activas.

**Funciones:**

- Buscar productos por texto.
- Filtrar por categoría.
- Ver productos favoritos.
- Usar promociones disponibles.
- Canjear productos con puntos.
- Abrir detalle de producto.

### 3.4 Detalle de producto

Permite revisar información completa del producto.

**Funciones:**

- Ver imagen, descripción, categoría, variantes, precio y stock.
- Marcar o quitar de favoritos.
- Consultar promedio y listado de reseñas.
- Publicar reseña con calificación de 1 a 5 estrellas.
- Agregar al carrito.

**Validaciones:**

- No se puede agregar una variante sin stock.
- La reseña requiere calificación válida y comentario suficientemente descriptivo.
- Si el cliente ya reseñó el producto, se actualiza su reseña.

### 3.5 Guías fitness

La sección Guías muestra contenido publicado por GymVerse.

**Funciones:**

- Filtrar por entrenamiento, nutrición, recuperación o hábitos.
- Leer contenido completo.
- Ver nivel y tiempo estimado de lectura.
- Consultar productos relacionados y abrirlos desde la guía.

### 3.6 Carrito y checkout

El carrito permite revisar productos, elegir entrega, aplicar cupón y seleccionar método de pago.

**Opciones de entrega:**

- Retiro en gimnasio.
- Envío a domicilio.

**Métodos de pago:**

- Mercado Pago.
- Pago al recoger, solo cuando la entrega es retiro en gimnasio.

**Validaciones:**

- No se puede finalizar compra con carrito vacío.
- El carrito tiene límite de productos.
- Cada variante tiene límite de cantidad.
- Para domicilio se requiere dirección completa.
- Para retiro se requiere gimnasio activo y habilitado.
- Mercado Pago debe estar configurado para pagos en línea.
- El pago al recoger no aplica para domicilio.
- El stock se valida antes de crear el pedido.

### 3.7 Cupones

El cliente puede aplicar cupones en el carrito.

**Tipos de cupón:**

- Porcentaje.
- Monto fijo.
- Envío gratis.

**Validaciones:**

- El cupón debe estar activo.
- Debe estar dentro de fechas vigentes.
- Debe cumplir compra mínima.
- No debe superar su límite de usos.

### 3.8 Confirmación y Mercado Pago

Cuando el cliente elige Mercado Pago, el sistema crea el pedido como pendiente de pago y redirige al checkout de Mercado Pago. Al regresar, la app sincroniza el pago con la API.

**Reglas:**

- El pago en línea tiene ventana de 24 horas.
- Si el pago vence, el pedido puede cancelarse y se restaura el stock.
- Si el pago se aprueba, el pedido pasa a preparación y se otorgan puntos una sola vez.

### 3.9 Mis compras

La vista de pedidos permite consultar compras y recompensas.

**Funciones:**

- Ver seguimiento del pedido.
- Ver código de retiro.
- Pagar pedidos pendientes.
- Cancelar pedidos en estados iniciales.
- Solicitar devolución de pedidos entregados.
- Ocultar pedidos del historial visible.
- Ver canjes de recompensas.

**Estados de pedido:**

- Pendiente de pago.
- Pagado.
- Preparando.
- Listo para recoger.
- En camino.
- Entregado.
- Cancelado.
- Devuelto.

### 3.10 Devoluciones

El cliente puede solicitar devolución únicamente en pedidos entregados.

**Validaciones:**

- El pedido debe estar entregado.
- El motivo debe tener al menos 10 caracteres.
- Solo puede existir una solicitud por pedido.

### 3.11 Avisos

La sección Avisos muestra notificaciones del sistema.

**Funciones:**

- Ver avisos de pedidos, pagos, soporte y devoluciones.
- Marcar todos como leídos.
- Limpiar avisos.
- Activar permisos de notificación del navegador.

### 3.12 Perfil

Permite administrar datos de cuenta y domicilio.

**Funciones:**

- Ver compras, domicilios, puntos y favoritos.
- Editar nombre y correo.
- Guardar domicilio.
- Acceder a documentos legales.
- Abrir soporte.
- Cerrar sesión.

**Nota:** Las tarjetas ya no se guardan en GymVerse como flujo principal; Mercado Pago procesa los medios de pago.

### 3.13 Soporte

El cliente puede crear tickets y responder conversaciones.

**Categorías:**

- Pedido.
- Pago.
- Devolución.
- Cuenta.
- Gimnasio.
- Otro.

**Funciones:**

- Crear ticket.
- Consultar estado.
- Responder mensajes.
- Cerrar ticket.

## 4. Panel Administrativo

### 4.1 Login admin/staff/gym

El panel permite acceso a usuarios con rol admin, staff o gym.

**Validaciones:**

- Credenciales correctas.
- Cuenta activa.
- Rol autorizado.
- Staff solo ve módulos permitidos.
- Gym entra al portal de gimnasio.

### 4.2 Resumen

Muestra métricas de ventas, ganancia, reabastecimiento, pedidos, clientes, stock bajo, gimnasios y pagos pendientes.

### 4.3 Pedidos

Permite consultar, filtrar, actualizar, archivar y descargar guías PDF.

**Funciones:**

- Buscar por pedido, cliente, producto o SKU.
- Filtrar por estado, pago y entrega.
- Cambiar estado.
- Cambiar pago.
- Confirmar retiro con código.
- Descargar guía PDF.
- Archivar pedidos cancelados.
- Restaurar archivados.

### 4.4 Avisos

Permite consultar notificaciones internas y enviar avisos por rol o usuario.

### 4.5 Soporte

Permite responder tickets, cambiar estado, prioridad y dar seguimiento a conversaciones con clientes.

### 4.6 Devoluciones

Permite revisar solicitudes, cambiar estado y registrar nota de resolución.

**Estados:**

- En revisión.
- Aprobada.
- Rechazada.
- Recibida.
- Reembolsada.

### 4.7 Inventario

Permite crear, editar, archivar productos y ajustar stock.

**Validaciones:**

- Producto con nombre, slug, categoría, proveedor y descripción.
- Variantes con SKU, etiqueta, precio y stock.
- Números no negativos.
- Imágenes PNG, JPG o WebP, máximo 4 MB.

### 4.8 Reabastecimiento

Permite crear guías PDF de compra a proveedores e historial de guías.

### 4.9 Gimnasios

Permite administrar gimnasios afiliados, pagos mensuales y accesos tipo gym.

**Funciones:**

- Crear/editar gimnasio.
- Marcar pago mensual.
- Activar o desactivar retiro.
- Crear acceso de usuario para gimnasio.
- Desactivar o reactivar acceso.

### 4.10 Proveedores

Permite crear, editar y archivar proveedores.

### 4.11 Promociones

Permite crear cupones de porcentaje, monto fijo o envío gratis.

**Campos:**

- Código.
- Título.
- Descripción.
- Tipo.
- Valor.
- Compra mínima.
- Tope de descuento.
- Límite de usos.
- Fechas de inicio y fin.
- Estado activo/pausado.

### 4.12 Recompensas

Permite crear drops canjeables con puntos y gestionar pedidos de recompensa.

### 4.13 Contenido

Permite crear guías fitness con tipo, nivel, lectura estimada, tags, productos relacionados y estado borrador/publicado.

### 4.14 Automatizaciones

Permite ejecutar reglas operativas:

- Pausar promociones vencidas.
- Detectar stock bajo.
- Avisar pagos de Mercado Pago pendientes.
- Marcar gimnasios con pago vencido.

### 4.15 Finanzas

Muestra resumen financiero, ingresos, costos, utilidad, descuentos y pagos pendientes.

### 4.16 Auditoría

Muestra acciones relevantes ejecutadas por usuarios internos: login, cambios de pedido, archivo, soporte, devoluciones, usuarios y otros eventos.

### 4.17 Legal

Permite editar documentos legales publicados o en borrador, incluyendo bloques de texto, versión y orden.

### 4.18 Usuarios y roles

Solo admin puede crear y administrar usuarios internos.

**Presets de rol:**

- Operación diaria.
- Inventario y compras.
- Afiliados.
- Marketing y contenido.
- Finanzas y reportes.
- Supervisor.

### 4.19 Reportes

Permite descargar reportes PDF y CSV de ventas, registros, pagos y movimientos.

## 5. Portal de Gimnasio

El rol gym accede a un portal enfocado en pedidos de retiro de su gimnasio.

**Funciones:**

- Ver pedidos asignados al gimnasio.
- Actualizar estados permitidos.
- Confirmar entrega con código de retiro.
- Marcar pago al recoger.

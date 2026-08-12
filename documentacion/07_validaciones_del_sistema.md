# Validaciones del Sistema - GymVerse

**Fecha de actualización:** 26 de julio de 2026

## 1. Seguridad general

- Rutas privadas requieren token JWT.
- Login, registro, Google Login y recuperación de contraseña tienen rate limit.
- CORS acepta únicamente los orígenes configurados para cliente y admin.
- Helmet se aplica en la API.
- JSON tiene límite de 8 MB.
- Payloads con operadores inseguros se rechazan.
- Cuentas disabled no pueden iniciar sesión.
- Admin, staff y gym se validan por rol.
- Staff se valida por permisos de módulo.
- Datos sensibles se cifran en base de datos.
- Acciones internas relevantes se registran en auditoría.

## 2. Login

- Correo obligatorio y con formato válido.
- Contraseña obligatoria.
- Cuenta existente.
- Cuenta activa.
- Contraseña correcta.
- Roles internos generan registro de auditoría.

## 3. Registro

- Nombre obligatorio con mínimo 3 caracteres.
- Correo obligatorio con formato válido.
- Correo único.
- Teléfono obligatorio con formato válido.
- Contraseña con mínimo 8 caracteres.
- Contraseña con letras y números.
- Confirmación de contraseña igual.

## 4. Google Login

- Google Login debe estar configurado con GOOGLE_CLIENT_ID.
- La credencial de Google debe ser válida.
- El correo verificado por Google se normaliza.
- Solo permite crear o entrar como cliente.
- Si el correo pertenece a admin, staff o gym, se bloquea en la app cliente.
- Si la cuenta está disabled, se bloquea el acceso.
- Si una cuenta de cliente ya existe, puede vincularse con Google.

## 5. Recuperación de contraseña

- Correo obligatorio y válido.
- Solo aplica a cuentas customer activas.
- Código de 6 dígitos.
- Código guardado como hash.
- Código con vencimiento de 15 minutos.
- Máximo 5 intentos por código.
- Nueva contraseña fuerte: mínimo 8 caracteres, letras y números.
- En cuenta Google vinculada, al cambiar contraseña puede pasar a proveedor mixed.

## 6. Perfil

- Nombre mínimo de 3 caracteres.
- Teléfono con formato válido.
- El correo no se edita desde perfil.
- Domicilio requiere etiqueta, calle, ciudad, estado, código postal y teléfono.
- Código postal con mínimo 4 dígitos.
- Teléfono de domicilio con formato válido.
- Datos de teléfono y dirección se almacenan cifrados.

## 7. Cambio de contraseña

- Requiere contraseña actual.
- Requiere nueva contraseña.
- La nueva contraseña debe ser fuerte.
- La confirmación debe coincidir en cliente.
- La nueva contraseña debe ser diferente de la actual.
- La contraseña actual debe coincidir con el hash guardado.

## 8. Gimnasios afiliados

- Búsqueda requiere al menos 2 caracteres.
- Solo se devuelven gimnasios activos y con pickupEnabled.
- Para afiliar, el gimnasio debe existir.
- Para afiliar, debe estar activo y permitir retiro.
- El cliente no debe duplicar el mismo gimnasio.
- Quitar afiliación solo elimina el gimnasio de futuras compras.

## 9. Catálogo

- Solo categorías activas.
- Solo productos activos.
- Búsqueda sanitizada.
- Filtro por categoría inválida devuelve lista vacía.
- Producto por slug debe existir y estar activo.
- Promociones deben estar activas y vigentes.
- Contenido debe estar publicado.
- Documentos legales deben estar publicados.

## 10. Favoritos

- Requiere sesión.
- Producto debe existir.
- Producto debe estar activo.
- No se duplican favoritos.
- Se puede quitar favorito por producto.

## 11. Reseñas

- Requiere sesión de cliente.
- Producto válido y activo.
- Calificación entre 1 y 5.
- Comentario mínimo de 8 caracteres.
- Una reseña por cliente y producto.
- Compra verificada si existe pedido entregado con ese producto.

## 12. Carrito y pedido

- Carrito no vacío.
- Máximo 25 líneas.
- ProductId válido.
- SKU válido.
- Cantidad por variante entre 1 y 20.
- Cantidades duplicadas se agrupan.
- Producto activo.
- Variante existente.
- Stock suficiente.
- Total calculado en servidor.

## 13. Entrega pickup

- Método de entrega debe ser pickup.
- Requiere gimnasio de retiro.
- Gimnasio debe existir.
- Gimnasio debe estar activo.
- Gimnasio debe permitir retiro.
- El cliente debe tener afiliado ese gimnasio.
- El stock se descuenta de GymStock.
- Si el stock local es insuficiente, no se crea el pedido.

## 14. Entrega a domicilio

- Método de entrega debe ser home.
- Requiere domicilio completo.
- Pago al recoger no aplica.
- Stock se descuenta del inventario central del producto.
- Envío se calcula como cargo de domicilio.

## 15. Pago

- Método permitido: mercado_pago o pickup.
- Mercado Pago debe estar configurado para pago en línea.
- Pedido Mercado Pago inicia como pending_payment.
- Pago pendiente vence después de 24 horas.
- Si vence, se cancela y restaura stock.
- Webhook puede actualizar el estado del pago.
- Pago al recoger solo se confirma al entregar o por operación autorizada.
- Los puntos se otorgan una sola vez.

## 16. Cupones

- Código normalizado a mayúsculas.
- Cupón activo.
- Vigencia por fecha de inicio y fin.
- Compra mínima cumplida.
- Límite de usos disponible.
- Tipo válido: percentage, fixed o free_shipping.
- Porcentaje entre 1 y 100.
- Descuento fijo mayor a 0.
- Descuento limitado por tope si aplica.
- Uso se libera si el pedido se cancela.

## 17. Cancelaciones

- Solo se cancelan pedidos pending_payment, paid o preparing.
- Al cancelar se restaura stock si no se había restaurado.
- En pickup se restaura GymStock hasta el máximo local permitido.
- En domicilio se restaura inventario central.
- Se libera cupón usado.

## 18. Portal de gimnasio

- Usuario debe tener rol gym.
- Solo accede al gimnasio vinculado.
- Solo ve pedidos asignados a su gimnasio.
- Puede cambiar estados permitidos.
- Para entregar, debe capturar código de retiro correcto.
- Si el pedido era pago al recoger, se marca pagado al confirmar entrega.

## 19. Reabastecimiento de gimnasio

- Usuario debe tener rol gym para solicitar.
- Solicitud máxima de 20 líneas.
- Cada línea requiere producto, SKU y cantidad.
- Cantidad por línea entre 1 y 10.
- Stock local actual + solicitado no puede superar 10 piezas por SKU.
- No puede haber solicitud pendiente duplicada para el mismo producto y SKU.
- Debe existir stock central suficiente.
- Admin confirma o cancela.
- Al confirmar, se descuenta inventario central y se incrementa GymStock.

## 20. Inventario administrativo

- Productos requieren datos base válidos.
- Variantes requieren SKU, etiqueta, precio y stock válidos.
- Categorías deben ser únicas por nombre/slug.
- Proveedores se validan y pueden archivarse.
- Subida de imágenes requiere archivo válido en dataUrl.
- Cloudinary debe estar configurado para guardar imágenes en producción.
- Algunas actualizaciones usan control de versión para evitar sobrescribir cambios recientes.

## 21. Recompensas

- RewardDrop debe estar activo y vigente.
- Cliente debe tener puntos suficientes.
- Variante debe existir.
- Stock de recompensa suficiente.
- Canje descuenta puntos una sola vez.
- RewardOrder registra estado y entrega.

## 22. Devoluciones

- Pedido debe existir.
- Pedido debe pertenecer al cliente.
- Pedido debe estar delivered.
- Motivo mínimo de 10 caracteres.
- Solo una devolución por pedido.
- Estados permitidos: requested, approved, rejected, received, refunded.

## 23. Soporte

- Asunto obligatorio.
- Mensaje obligatorio.
- Mensaje con longitud limitada.
- Categoría válida.
- Admin puede actualizar estado, prioridad y respuesta.

## 24. Notificaciones

- Usuario solo ve notificaciones propias, por rol o por audiencia.
- Se pueden marcar como leídas.
- Se pueden limpiar para el usuario.
- Broadcast administrativo requiere permisos.

## 25. Legal, contenido y auditoría

- Legal requiere clave, título, contenido, versión y estado.
- Solo documentos published se muestran al cliente.
- Contenido publicado se muestra en app cliente.
- Contenido archivado puede restaurarse.
- Acciones administrativas sensibles se registran en AuditLog.

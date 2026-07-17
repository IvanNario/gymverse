# Validaciones del Sistema - GymVerse

## 1. Seguridad general

- Rutas privadas requieren token JWT.
- Login y registro tienen rate limit.
- Cargas JSON tienen límite de tamaño.
- Payloads inseguros se rechazan.
- Admin, staff y gym se validan por rol.
- Staff se valida por permisos de módulo.
- Cuentas desactivadas no pueden iniciar sesión.

## 2. Registro

- Nombre, correo y contraseña obligatorios.
- Correo con formato válido.
- Contraseña mínima de 8 caracteres.
- Correo único.

## 3. Login

- Correo válido.
- Contraseña presente.
- Cuenta existente.
- Cuenta activa.
- Contraseña correcta.

## 4. Perfil

- Nombre limpio con longitud limitada.
- Correo válido y único.
- Direcciones se limpian y solo se guardan si tienen etiqueta y calle.
- Datos sensibles de dirección se almacenan cifrados.

## 5. Favoritos

- El producto debe existir.
- El producto debe estar activo.
- No se duplican favoritos.

## 6. Catálogo

- Categorías activas.
- Productos activos.
- Búsqueda sanitizada.
- Categoría inválida devuelve lista vacía.

## 7. Reseñas

- Producto válido y activo.
- Calificación entre 1 y 5.
- Comentario mínimo suficiente.
- Una reseña por cliente y producto.
- Compra verificada si existe pedido entregado con ese producto.

## 8. Carrito y pedido

- Carrito no vacío.
- Máximo 25 líneas en carrito.
- ProductoId válido.
- SKU válido.
- Cantidad por variante entre 1 y 20.
- Cantidades duplicadas se agrupan.
- Stock suficiente.
- Producto activo.
- Variante existente.

## 9. Entrega

- Método de entrega: pickup o home.
- Pickup requiere gimnasio válido, activo y con retiro habilitado.
- Domicilio requiere calle, ciudad, estado, código postal y teléfono.

## 10. Pago

- Método: mercado_pago o pickup.
- Pago al recoger solo aplica con pickup.
- Mercado Pago debe estar configurado.
- Pedido con Mercado Pago queda pendiente de pago.
- Pago pendiente vence en 24 horas.
- Al vencer, se cancela y restaura stock.
- Los puntos se otorgan una sola vez.

## 11. Cupones

- Código normalizado a mayúsculas.
- Cupón activo.
- Vigencia por fecha de inicio y fin.
- Compra mínima.
- Límite de usos.
- Descuento limitado por tope si aplica.
- Envío gratis cambia envío a cero.
- Uso se libera si pedido se cancela.

## 12. Cancelaciones

- Solo se cancelan pedidos pending_payment, paid o preparing.
- Al cancelar se restaura stock si no se había restaurado.
- Se libera el cupón usado.

## 13. Devoluciones

- Motivo mínimo de 10 caracteres.
- Pedido debe existir y pertenecer al cliente.
- Pedido debe estar entregado.
- Solo una devolución por pedido.
- Estados admin: requested, approved, rejected, received, refunded.

## 14. Notificaciones

- Usuario solo ve notificaciones propias o por su rol.
- Puede marcar como leídas.
- Puede limpiar notificaciones visibles para él.

## 15. Soporte

- Asunto y mensaje son obligatorios.
- Mensaje con longitud limitada.
- Categoría válida.
- No se responde ticket resuelto.
- Cliente solo accede a sus tickets.

## 16. Inventario

- Producto requiere nombre, slug, categoría, proveedor y descripción.
- Variante requiere SKU, etiqueta, precio y stock.
- Precio, costo, stock y puntos no negativos.
- Imagen PNG, JPG o WebP.
- Imagen máxima 4 MB.
- Stock nunca baja de cero en ajustes.

## 17. Recompensas

- Drop requiere título.
- Drop requiere al menos un producto válido.
- Solo un drop activo a la vez.
- Producto canjeable activo.
- Stock suficiente en drop y producto.
- Usuario con puntos suficientes.
- Puntos y stock se descuentan al canjear.

## 18. Gimnasios

- Nombre, código, dirección y ciudad obligatorios.
- Código único en mayúsculas.
- Cuota no negativa.
- Estado válido.
- Acceso gym requiere correo válido y contraseña temporal mínima.

## 19. Proveedores

- Nombre obligatorio y único.
- Estado válido.
- Datos de contacto cifrados.

## 20. Promociones

- Código obligatorio y único.
- Descripción obligatoria.
- Tipo válido: percentage, fixed, free_shipping.
- Valores numéricos no negativos.
- Activación/pausa controlada por admin.

## 21. Contenido

- Título, slug, resumen y cuerpo obligatorios.
- Tipo válido.
- Nivel válido.
- Lectura mínima de 1 minuto.
- Solo contenido publicado aparece en cliente.

## 22. Legal

- Documento requiere título, introducción y bloques.
- Cada bloque requiere encabezado y texto.
- Estado: draft o published.
- Solo documentos publicados aparecen al cliente.

## 23. Usuarios internos

- Solo admin crea o edita usuarios internos.
- Nombre, correo y preset requeridos.
- Contraseña temporal mínima 8 caracteres al crear.
- Permisos normalizados por preset.
- Usuario admin principal no se desactiva desde la lista.

## 24. Reportes

- Solo se generan reportes soportados.
- PDF y CSV disponibles.
- Si el reporte no existe, responde "Reporte no disponible".

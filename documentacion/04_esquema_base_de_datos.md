# Esquema de Base de Datos - GymVerse

**Fecha de actualización:** 26 de julio de 2026

## 1. Resumen

GymVerse usa MongoDB con Mongoose. La base de datos está orientada a comercio, recompensas, operación de gimnasios afiliados, soporte, contenido, auditoría y administración.

Los datos sensibles como teléfonos, direcciones y contactos se almacenan cifrados mediante utilidades de cifrado configuradas con DATA_ENCRYPTION_KEY.

## 2. User

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre del usuario. |
| email | String | Correo único en minúsculas. |
| phone | String cifrado | Teléfono del cliente o usuario. |
| passwordHash | String | Hash de contraseña. |
| authProvider | String | password, google o mixed. |
| googleSubject | String | Identificador privado de Google. |
| passwordResetCodeHash | String | Hash del código de recuperación, oculto por defecto. |
| passwordResetExpiresAt | Date | Vencimiento del código de recuperación. |
| passwordResetAttempts | Number | Intentos usados para recuperación. |
| role | String | customer, admin, staff o gym. |
| adminRolePreset | String | Preset administrativo aplicado. |
| permissions | Array String | Permisos por módulo. |
| status | String | active o disabled. |
| gym | ObjectId Gym | Gimnasio asociado para usuarios tipo gym. |
| affiliatedGyms | Array ObjectId Gym | Gimnasios afiliados por el cliente. |
| addresses | Array | Domicilios cifrados. |
| hiddenOrders | Array ObjectId Order | Pedidos ocultos por el cliente. |
| favorites | Array ObjectId Product | Productos favoritos. |
| points | Number | Puntos disponibles. |

## 3. Product

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre del producto. |
| slug | String | Identificador único para URL. |
| category | ObjectId Category | Categoría del producto. |
| supplier | ObjectId Supplier | Proveedor. |
| description | String | Descripción comercial. |
| imageUrl | String | Imagen, normalmente alojada en Cloudinary. |
| tags | Array String | Etiquetas de búsqueda. |
| status | String | active, draft o archived. |
| pointsEarned | Number | Puntos que genera al comprar. |
| variants | Array | Variantes de producto. |

## 4. Product Variant

| Campo | Tipo | Descripción |
|---|---|---|
| sku | String | SKU único por variante dentro del producto. |
| label | String | Etiqueta visible. |
| price | Number | Precio de venta. |
| cost | Number | Costo. |
| stock | Number | Stock central para ventas a domicilio y reabastecimiento. |
| attributes | Map | Atributos como sabor, talla o presentación. |

## 5. Category

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre único. |
| slug | String | Slug único. |
| description | String | Descripción. |
| active | Boolean | Define si se muestra en catálogo. |

## 6. Supplier

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre del proveedor. |
| contactName | String cifrado | Persona de contacto. |
| email | String cifrado | Correo de contacto. |
| phone | String cifrado | Teléfono. |
| status | String | active, paused o archived. |

## 7. Gym

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre del gimnasio. |
| code | String | Código único. |
| address | String cifrado | Dirección. |
| city | String cifrado | Ciudad. |
| phone | String cifrado | Teléfono. |
| pickupEnabled | Boolean | Permite retiro de pedidos. |
| status | String | active, paused o archived. |
| capacity | String | low, medium o high. |
| membershipFee | Number | Cuota mensual. |
| paymentStatus | String | pending, paid u overdue. |
| lastPaymentAt | Date | Último pago registrado. |
| nextPaymentDue | Date | Próxima fecha de pago. |

## 8. GymStock

| Campo | Tipo | Descripción |
|---|---|---|
| gym | ObjectId Gym | Gimnasio dueño del stock local. |
| product | ObjectId Product | Producto relacionado. |
| productName | String | Nombre congelado para lectura rápida. |
| sku | String | Variante del producto. |
| variantLabel | String | Etiqueta de variante. |
| quantity | Number | Cantidad local disponible, mínimo 0 y máximo 10. |

**Índice único:** gym + product + sku.

## 9. GymRestockRequest

| Campo | Tipo | Descripción |
|---|---|---|
| requestNumber | String | Folio único de solicitud. |
| gym | ObjectId Gym | Gimnasio solicitante. |
| items | Array | Productos solicitados. |
| status | String | requested, transferred o cancelled. |
| note | String | Nota del gimnasio. |
| adminNote | String | Nota administrativa. |
| requestedBy | ObjectId User | Usuario gym que solicitó. |
| confirmedBy | ObjectId User | Usuario que confirma o cancela. |
| confirmedAt | Date | Fecha de confirmación o cancelación. |

### Items de solicitud

| Campo | Tipo | Descripción |
|---|---|---|
| product | ObjectId Product | Producto. |
| productName | String | Nombre del producto. |
| sku | String | SKU solicitado. |
| variantLabel | String | Variante. |
| quantity | Number | Cantidad entre 1 y 10. |
| currentStock | Number | Stock local al solicitar. |

## 10. Order

| Campo | Tipo | Descripción |
|---|---|---|
| orderNumber | String | Folio único. |
| customer | ObjectId User | Cliente. |
| items | Array | Productos comprados. |
| subtotal | Number | Subtotal. |
| shippingFee | Number | Costo de envío. |
| discount | Number | Descuento aplicado. |
| discountCode | String | Cupón usado. |
| total | Number | Total. |
| pointsEarned | Number | Puntos generados. |
| deliveryMethod | String | pickup o home. |
| pickupGym | ObjectId Gym | Gimnasio de retiro. |
| pickupCode | String | Código de entrega. |
| deliveredAt | Date | Fecha de entrega. |
| shippingAddress | Object cifrado | Domicilio de envío. |
| status | String | pending_payment, paid, preparing, ready_for_pickup, shipped, delivered o cancelled. |
| paymentStatus | String | pending, paid o refunded. |
| paymentMethod | String | pickup o mercado_pago. |
| paymentProvider | String | pickup o mercado_pago. |
| providerPreferenceId | String | Preferencia Mercado Pago. |
| providerPaymentId | String | Pago de Mercado Pago. |
| providerStatus | String | Estado devuelto por proveedor. |
| paymentUrl | String | Link de pago. |
| paymentExpiresAt | Date | Vencimiento de pago pendiente. |
| stockRestoredAt | Date | Fecha de restauración de stock. |
| adminArchivedAt | Date | Fecha de archivo admin. |
| paidAt | Date | Fecha de pago confirmado. |
| pointsGrantedAt | Date | Fecha de otorgamiento de puntos. |

## 11. Coupon

| Campo | Tipo | Descripción |
|---|---|---|
| code | String | Código único normalizado. |
| description | String | Descripción. |
| type | String | percentage, fixed o free_shipping. |
| value | Number | Valor del descuento. |
| minSubtotal | Number | Subtotal mínimo. |
| maxDiscount | Number | Tope de descuento. |
| usageLimit | Number | Límite total de usos. |
| usedCount | Number | Usos registrados. |
| startsAt | Date | Inicio de vigencia. |
| endsAt | Date | Fin de vigencia. |
| active | Boolean | Estado activo. |

## 12. RewardDrop y RewardOrder

RewardDrop define recompensas disponibles para canje por puntos. RewardOrder registra el canje realizado por un cliente.

| Modelo | Campos clave |
|---|---|
| RewardDrop | title, product, sku, pointsCost, stock, startsAt, endsAt, active. |
| RewardOrder | orderNumber, customer, rewardDrop, product, sku, pointsCost, deliveryMethod, pickupGym, shippingAddress, status. |

## 13. ProductReview

| Campo | Tipo | Descripción |
|---|---|---|
| product | ObjectId Product | Producto reseñado. |
| customer | ObjectId User | Cliente. |
| rating | Number | Calificación de 1 a 5. |
| comment | String | Comentario. |
| verifiedPurchase | Boolean | Indica si hubo compra entregada. |

**Índice único:** product + customer.

## 14. Soporte, legales, contenido y notificaciones

| Modelo | Propósito |
|---|---|
| SupportTicket | Tickets de soporte de clientes. |
| LegalDocument | Documentos legales publicados y versionados. |
| ContentPost | Contenido fitness publicado, archivado o restaurable. |
| Notification | Avisos dirigidos por usuario, rol o audiencia. |

## 15. Auditoría, automatizaciones y reportes operativos

| Modelo | Propósito |
|---|---|
| AuditLog | Bitácora de acciones internas. |
| AutomationRun | Ejecuciones de automatizaciones. |
| StockMovement | Movimientos de inventario central. |
| RestockGuide | Guías PDF de reabastecimiento. |
| ReturnRequest | Solicitudes de devolución. |

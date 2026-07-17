# Esquema de Base de Datos - GymVerse

## 1. Resumen

La base de datos usa MongoDB con Mongoose. Los modelos principales cubren usuarios, pedidos, productos, inventario, cupones, recompensas, contenido, soporte, devoluciones, notificaciones, legales, auditoría y automatizaciones.

## 2. User

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre. |
| email | String | Correo único. |
| passwordHash | String | Contraseña cifrada. |
| role | String | customer, admin, staff o gym. |
| adminRolePreset | String | Preset de permisos staff. |
| permissions | Array String | Permisos específicos. |
| status | String | active o disabled. |
| gym | ObjectId | Gimnasio asociado para rol gym. |
| addresses | Array | Direcciones cifradas. |
| hiddenOrders | Array ObjectId | Pedidos ocultos por cliente. |
| favorites | Array ObjectId | Productos favoritos. |
| points | Number | Puntos acumulados. |

## 3. Product

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre. |
| slug | String | Identificador único. |
| category | ObjectId | Categoría. |
| supplier | ObjectId | Proveedor. |
| description | String | Descripción. |
| imageUrl | String | Imagen. |
| tags | Array String | Etiquetas. |
| status | String | active, draft o archived. |
| pointsEarned | Number | Puntos por compra. |
| variants | Array | Variantes. |

## 4. Product Variant

| Campo | Tipo | Descripción |
|---|---|---|
| sku | String | SKU. |
| label | String | Etiqueta. |
| price | Number | Precio. |
| cost | Number | Costo. |
| stock | Number | Existencia. |
| attributes | Map | Atributos. |

## 5. Category

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre único. |
| slug | String | Slug único. |
| description | String | Descripción. |
| active | Boolean | Estado visible. |

## 6. Supplier

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre único. |
| contactName | String | Contacto cifrado. |
| email | String | Correo cifrado. |
| phone | String | Teléfono cifrado. |
| status | String | active, paused o archived. |

## 7. Gym

| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre. |
| code | String | Código único. |
| address | String | Dirección cifrada. |
| city | String | Ciudad cifrada. |
| phone | String | Teléfono cifrado. |
| pickupEnabled | Boolean | Permite retiro. |
| status | String | active, paused o archived. |
| capacity | String | low, medium o high. |
| membershipFee | Number | Cuota mensual. |
| paymentStatus | String | pending, paid u overdue. |
| lastPaymentAt | Date | Último pago. |
| nextPaymentDue | Date | Siguiente pago. |

## 8. Order

| Campo | Tipo | Descripción |
|---|---|---|
| orderNumber | String | Folio único. |
| customer | ObjectId | Cliente. |
| items | Array | Productos comprados. |
| subtotal | Number | Subtotal. |
| shippingFee | Number | Envío. |
| discount | Number | Descuento. |
| discountCode | String | Cupón usado. |
| total | Number | Total. |
| pointsEarned | Number | Puntos generados. |
| deliveryMethod | String | pickup o home. |
| pickupGym | ObjectId | Gimnasio de retiro. |
| pickupCode | String | Código de retiro. |
| deliveredAt | Date | Fecha de entrega. |
| shippingAddress | Object | Dirección cifrada. |
| status | String | Estado operativo. |
| paymentStatus | String | pending, paid o refunded. |
| paymentMethod | String | card, pickup o mercado_pago. |
| paymentProvider | String | demo_card, pickup o mercado_pago. |
| providerPreferenceId | String | Preferencia Mercado Pago. |
| providerPaymentId | String | Pago Mercado Pago. |
| providerStatus | String | Estado proveedor. |
| paymentUrl | String | URL de pago. |
| paymentExpiresAt | Date | Vencimiento del pago. |
| stockRestoredAt | Date | Restauración de stock. |
| adminArchivedAt | Date | Archivo interno. |
| paidAt | Date | Fecha de pago. |
| pointsGrantedAt | Date | Fecha de puntos otorgados. |

## 9. Coupon

| Campo | Tipo | Descripción |
|---|---|---|
| code | String | Código único en mayúsculas. |
| title | String | Título. |
| description | String | Descripción. |
| type | String | percentage, fixed o free_shipping. |
| value | Number | Valor. |
| minSubtotal | Number | Compra mínima. |
| maxDiscount | Number | Tope. |
| usageLimit | Number | Límite de usos. |
| usedCount | Number | Usos consumidos. |
| active | Boolean | Activo. |
| startsAt | Date | Inicio. |
| endsAt | Date | Fin. |

## 10. ProductReview

| Campo | Tipo | Descripción |
|---|---|---|
| product | ObjectId | Producto. |
| customer | ObjectId | Cliente. |
| rating | Number | 1 a 5. |
| comment | String | Comentario. |
| verifiedPurchase | Boolean | Compra verificada. |

## 11. ReturnRequest

| Campo | Tipo | Descripción |
|---|---|---|
| returnNumber | String | Folio único. |
| order | ObjectId | Pedido. |
| customer | ObjectId | Cliente. |
| reason | String | Motivo. |
| resolutionNote | String | Nota de resolución. |
| status | String | requested, approved, rejected, received o refunded. |
| requestedAt | Date | Fecha de solicitud. |
| resolvedAt | Date | Fecha de resolución. |

## 12. SupportTicket

| Campo | Tipo | Descripción |
|---|---|---|
| ticketNumber | String | Folio único. |
| customer | ObjectId | Cliente. |
| subject | String | Asunto. |
| category | String | order, payment, return, account, gym u other. |
| status | String | open, waiting_customer, waiting_team o resolved. |
| priority | String | low, normal o high. |
| order | ObjectId | Pedido relacionado. |
| assignedTo | ObjectId | Usuario asignado. |
| messages | Array | Conversación. |
| resolvedAt | Date | Cierre. |

## 13. Notification

| Campo | Tipo | Descripción |
|---|---|---|
| recipient | ObjectId | Usuario destino. |
| role | String | Notificación por rol. |
| title | String | Título. |
| message | String | Mensaje. |
| type | String | Tipo. |
| linkType | String | Tipo de enlace. |
| linkId | ObjectId | Recurso enlazado. |
| readAt | Date | Lectura individual. |
| readBy | Array ObjectId | Lecturas por rol. |
| clearedBy | Array ObjectId | Ocultos por usuario. |

## 14. ContentPost

| Campo | Tipo | Descripción |
|---|---|---|
| title | String | Título. |
| slug | String | Slug único. |
| summary | String | Resumen. |
| body | String | Contenido. |
| type | String | training, nutrition, recovery o lifestyle. |
| level | String | beginner, intermediate o advanced. |
| readMinutes | Number | Minutos de lectura. |
| tags | Array String | Etiquetas. |
| imageUrl | String | Imagen. |
| featured | Boolean | Destacado. |
| status | String | draft, published o archived. |
| relatedProducts | Array ObjectId | Productos relacionados. |
| publishedAt | Date | Fecha publicación. |
| createdBy | ObjectId | Creador. |

## 15. LegalDocument

| Campo | Tipo | Descripción |
|---|---|---|
| key | String | Clave única. |
| title | String | Título. |
| intro | String | Introducción. |
| status | String | draft o published. |
| versionLabel | String | Versión. |
| sortOrder | Number | Orden. |
| blocks | Array | Bloques con heading y text. |
| updatedBy | ObjectId | Último editor. |

## 16. RewardDrop y RewardOrder

**RewardDrop:** título, subtítulo, banner, imagen, estado, fechas, items canjeables y creador.  
**RewardDrop item:** producto, SKU, costo en puntos, stock y activo.  
**RewardOrder:** folio, cliente, drop, items, puntos totales, entrega, gimnasio y estado.

## 17. StockMovement y RestockGuide

**StockMovement:** producto, SKU, variante, proveedor, cantidad, costo, total, nota y creador.  
**RestockGuide:** folio, items, total de piezas, costo total y creador.

## 18. AuditLog

Registra actor, rol, acción, recurso, ID, IP, user agent y metadata.

## 19. AutomationRun

Registra regla ejecutada, estado, resumen, disparadores, cambios, detalles y usuario creador.

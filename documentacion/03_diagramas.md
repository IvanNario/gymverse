# Diagramas - GymVerse

## 1. Arquitectura general

```mermaid
flowchart LR
    Cliente["PWA Cliente React"] --> API["API Express /api"]
    Admin["Panel Admin React"] --> API
    Gym["Portal Gimnasio"] --> API
    API --> DB[("MongoDB")]
    API --> MP["Mercado Pago"]
    MP --> WH["Webhook de pagos"]
    WH --> API
    API --> PDF["PDF / CSV"]
    API --> Notif["Notificaciones"]
```

## 2. Flujo de compra con Mercado Pago

```mermaid
flowchart TD
    A["Cliente agrega productos"] --> B["Selecciona entrega"]
    B --> C["Aplica cupón opcional"]
    C --> D{"Método de pago"}
    D -->|Mercado Pago| E["API valida carrito, stock y cupón"]
    D -->|Pago al recoger| F["API valida retiro en gimnasio"]
    E --> G["Reserva stock y crea pedido pendiente"]
    G --> H["Crea preferencia Mercado Pago"]
    H --> I["Cliente paga en Mercado Pago"]
    I --> J["Webhook confirma pago"]
    J --> K["Pedido pasa a preparación"]
    K --> L["Se otorgan puntos una sola vez"]
    F --> M["Pedido queda en preparación y pago pendiente"]
```

## 3. Flujo de pedido pendiente

```mermaid
flowchart TD
    A["Pedido pendiente de pago"] --> B{"¿Pago dentro de 24 h?"}
    B -->|Sí| C["Pago aprobado"]
    C --> D["Pedido en preparación"]
    B -->|No| E["Pedido cancelado"]
    E --> F["Se restaura stock"]
    F --> G["Se libera uso de cupón"]
```

## 4. Flujo de retiro en gimnasio

```mermaid
flowchart TD
    A["Pedido de retiro"] --> B["Sistema genera código"]
    B --> C["Cliente ve código en Mis compras"]
    C --> D["Gimnasio solicita código"]
    D --> E{"Código correcto"}
    E -->|Sí| F["Pedido entregado"]
    E -->|No| G["Error: código incorrecto"]
    F --> H["Si pago al recoger, se marca pagado"]
```

## 5. Flujo de devoluciones

```mermaid
flowchart TD
    A["Pedido entregado"] --> B["Cliente solicita devolución"]
    B --> C["API valida motivo y pedido"]
    C --> D["Admin revisa devolución"]
    D --> E{"Resolución"}
    E -->|Aprobar| F["Aprobada"]
    E -->|Rechazar| G["Rechazada"]
    F --> H["Recibida"]
    H --> I["Reembolsada"]
```

## 6. Flujo de soporte

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as API
    participant A as Admin/Staff

    C->>API: Crea ticket
    API-->>A: Notifica nuevo ticket
    A->>API: Responde ticket
    API-->>C: Notifica respuesta
    C->>API: Responde o cierra
```

## 7. Flujo de contenido

```mermaid
flowchart TD
    A["Admin crea guía"] --> B{"Estado"}
    B -->|Borrador| C["No visible al cliente"]
    B -->|Publicado| D["Visible en Guías"]
    D --> E["Cliente lee contenido"]
    E --> F["Abre productos relacionados"]
```

## 8. Flujo de permisos admin

```mermaid
flowchart TD
    A["Usuario interno inicia sesión"] --> B{"Rol"}
    B -->|admin| C["Acceso completo"]
    B -->|staff| D["Permisos por preset"]
    B -->|gym| E["Portal de gimnasio"]
    D --> F["Módulos permitidos"]
```

## 9. Diagrama entidad-relación

```mermaid
erDiagram
    USER ||--o{ ORDER : creates
    USER ||--o{ SUPPORT_TICKET : opens
    USER ||--o{ RETURN_REQUEST : requests
    USER ||--o{ REWARD_ORDER : redeems
    USER ||--o{ PRODUCT_REVIEW : writes
    USER ||--o{ AUDIT_LOG : performs
    CATEGORY ||--o{ PRODUCT : classifies
    SUPPLIER ||--o{ PRODUCT : supplies
    PRODUCT ||--o{ ORDER_ITEM : sold_as
    PRODUCT ||--o{ PRODUCT_REVIEW : receives
    PRODUCT ||--o{ STOCK_MOVEMENT : moves
    PRODUCT ||--o{ REWARD_DROP_ITEM : offered_as
    GYM ||--o{ ORDER : pickup_point
    GYM ||--o{ USER : access_user
    ORDER ||--o| RETURN_REQUEST : may_have
    REWARD_DROP ||--o{ REWARD_ORDER : generates
    COUPON ||--o{ ORDER : applies_to
    CONTENT_POST }o--o{ PRODUCT : relates
```

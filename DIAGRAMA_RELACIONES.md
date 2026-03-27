# 🗺️ DIAGRAMA DE RELACIONES - BOOKING SPORT DATABASE

## 📐 ARQUITECTURA DE BASE DE DATOS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MÓDULO USERS (4 modelos)                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │     User     │ (BIGINT)
                              │  user_id PK  │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────┐     ┌──────────┐    ┌──────────────┐
            │  Person  │     │ UserRole │    │ UserFavorite │
            │ user_id  │     │ user_id  │    │   user_id    │
            │   FK     │     │ role_id  │    │ sucursal_id  │
            └──────────┘     │   FK     │    │     FK       │
                             └────┬─────┘    └──────┬───────┘
                                  │                 │
                                  ▼                 ▼
                             ┌────────┐      ┌──────────┐
                             │  Role  │      │ Company  │
                             └────────┘      └──────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        MÓDULO FACILITY (6 modelos)                           │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │     Company     │ (BIGINT)
                         │  company_id PK  │
                         │  country_id FK  │
                         │ parent_comp FK  │
                         └────────┬────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐        ┌──────────────┐         ┌──────────────┐
│     Space     │        │Configuration │         │    Rating    │
│  space_id PK  │        │ company_id   │         │ sucursal_id  │
│sucursal_id FK │        │     FK       │         │   user_id    │
│surf_type_id FK│        └──────────────┘         │ booking_id   │
│sport_type_id  │                                 │     FK       │
│sport_cat_id   │                                 └──────────────┘
│     FK        │
└───────┬───────┘
        │
        ▼
┌──────────────┐
│BusinessHour  │
│  space_id FK │
└──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         MÓDULO BOOKING (2 modelos)                           │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │     Booking     │ (BIGINT)
                         │  booking_id PK  │
                         │   user_id FK    │
                         │   space_id FK   │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
                    ▼                           ▼
            ┌──────────────┐            ┌──────────┐
            │   Payment    │            │  Rating  │
            │ booking_id   │            │booking_id│
            │     FK       │            │   FK     │
            │payment_type  │            └──────────┘
            │     FK       │
            └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      MÓDULO NOTIFICATION (1 modelo)                          │
└─────────────────────────────────────────────────────────────────────────────┘

                      ┌──────────────────────┐
                      │    Notification      │ (BIGINT)
                      │ notification_id PK   │
                      │   client_id FK       │
                      │   company_id FK      │
                      └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         MÓDULO MEDIA (1 modelo)                              │
└─────────────────────────────────────────────────────────────────────────────┘

                      ┌──────────────────────┐
                      │       Media          │ (BIGINT - Polimórfico)
                      │    media_id PK       │
                      │   medible_id         │
                      │   medible_type       │
                      │  (Company/Space/User)│
                      └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       MÓDULO CATALOGS (9 modelos)                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
│ Country  │────▶│ Department │────▶│ Province │────▶│ District │
│   PK     │     │country_id  │     │  dept_id │     │  prov_id │
└────┬─────┘     │    FK      │     │    FK    │     │    FK    │
     │           └────────────┘     └──────────┘     └──────────┘
     │
     ▼
┌──────────────┐
│ PaymentType  │
│ country_id   │
│     FK       │
└──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  SportType   │     │SportCategory │     │ SurfaceType  │
│      PK      │     │      PK      │     │      PK      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                      ┌──────────┐
                      │  Space   │
                      └──────────┘
```

---

## 🔗 RELACIONES DETALLADAS

### **User (Centro del Sistema)**

**Relaciones Directas:**

- `User` 1:1 `Person` (información personal)
- `User` 1:N `UserRole` (roles asignados)
- `User` 1:N `UserFavorite` (sucursales favoritas)
- `User` 1:N `Booking` (reservas realizadas)
- `User` 1:N `Rating` (calificaciones dadas)
- `User` 1:N `Media` (fotos de perfil - polimórfico)
- `User` 1:N `Notification` (notificaciones recibidas)

**Relaciones de Auditoría:**

- `User` es creador de: Company, Space, Media, Configuration, etc.

---

### **Company (Compañías y Sucursales)**

**Relaciones Directas:**

- `Company` N:1 `Country` (ubicación)
- `Company` 1:N `Space` (espacios deportivos)
- `Company` 1:N `Media` (fotos/videos - polimórfico)
- `Company` 1:1 `Configuration` (configuración detallada)
- `Company` 1:N `Company` (subsidiarias - auto-referencia)
- `Company` 1:N `Rating` (calificaciones recibidas) ✨ **NUEVA**
- `Company` 1:N `UserFavorite` (usuarios que la favorecen) ✨ **NUEVA**
- `Company` 1:N `Notification` (notificaciones enviadas) ✨ **NUEVA**

---

### **Space (Espacios Deportivos)**

**Relaciones Directas:**

- `Space` N:1 `Company` (sucursal propietaria)
- `Space` N:1 `SurfaceType` (tipo de superficie)
- `Space` N:1 `SportType` (tipo de deporte)
- `Space` N:1 `SportCategory` (categoría deportiva)
- `Space` 1:N `BusinessHour` (horarios de operación)
- `Space` 1:N `Media` (fotos/videos - polimórfico)
- `Space` 1:N `Booking` (reservas del espacio)

---

### **Booking (Reservas)**

**Relaciones Directas:**

- `Booking` N:1 `User` (usuario que reserva)
- `Booking` N:1 `Space` (espacio reservado)
- `Booking` 1:1 `Payment` (pago de la reserva)
- `Booking` 1:1 `Rating` (calificación opcional)

---

### **Media (Polimórfico)**

**Puede pertenecer a:**

- `Company` (fotos de instalaciones)
- `Space` (fotos de espacios)
- `User` (foto de perfil)

**Implementación:**

```javascript
medible_id: BIGINT      // ID del modelo relacionado
medible_type: STRING    // 'Company', 'Space', 'User'
```

---

## 📊 TIPOS DE RELACIONES

### **1:1 (Uno a Uno)**

- User ↔ Person
- Company ↔ Configuration
- Booking ↔ Payment
- Booking ↔ Rating

### **1:N (Uno a Muchos)**

- User → Booking
- User → Rating
- User → UserFavorite
- Company → Space
- Company → Rating ✨
- Company → UserFavorite ✨
- Company → Notification ✨
- Space → Booking
- Space → BusinessHour
- Country → Company
- SportType → Space
- SurfaceType → Space
- SportCategory → Space

### **N:M (Muchos a Muchos)**

- User ↔ Role (a través de UserRole)

### **Polimórficas**

- Media → Company/Space/User

### **Auto-Referencia**

- Company → Company (parent_company_id)

---

## 🎯 CLAVES FORÁNEAS PRINCIPALES

| Modelo       | FK                | Referencia                      | Tipo   |
| ------------ | ----------------- | ------------------------------- | ------ |
| Person       | user_id           | User.user_id                    | BIGINT |
| UserRole     | user_id           | User.user_id                    | BIGINT |
| UserRole     | role_id           | Role.role_id                    | BIGINT |
| UserFavorite | user_id           | User.user_id                    | BIGINT |
| UserFavorite | sucursal_id       | Company.company_id              | BIGINT |
| Company      | country_id        | Country.country_id              | BIGINT |
| Company      | parent_company_id | Company.company_id              | BIGINT |
| Space        | sucursal_id       | Company.company_id              | BIGINT |
| Space        | surface_type_id   | SurfaceType.surface_type_id     | BIGINT |
| Space        | sport_type_id     | SportType.sport_type_id         | BIGINT |
| Space        | sport_category_id | SportCategory.sport_category_id | BIGINT |
| BusinessHour | space_id          | Space.space_id                  | BIGINT |
| Rating       | user_id           | User.user_id                    | BIGINT |
| Rating       | sucursal_id       | Company.company_id              | BIGINT |
| Rating       | booking_id        | Booking.booking_id              | BIGINT |
| Booking      | user_id           | User.user_id                    | BIGINT |
| Booking      | space_id          | Space.space_id                  | BIGINT |
| Payment      | booking_id        | Booking.booking_id              | BIGINT |
| Payment      | payment_type_id   | PaymentType.payment_type_id     | BIGINT |
| Notification | client_id         | User.user_id                    | BIGINT |
| Notification | company_id        | Company.company_id              | BIGINT |
| Media        | medible_id        | * (polimórfico)                | BIGINT |

---

## ✅ INTEGRIDAD REFERENCIAL

Todas las claves foráneas ahora:

- ✅ Usan el mismo tipo de dato que la clave primaria (BIGINT)
- ✅ Tienen referencias explícitas en el modelo
- ✅ Tienen índices para optimizar consultas
- ✅ Tienen nombres consistentes

---

## 🔄 FLUJO DE DATOS PRINCIPAL

```
1. User se registra
   ↓
2. User busca Company (sucursales)
   ↓
3. User marca Company como favorita (UserFavorite)
   ↓
4. User ve Spaces de la Company
   ↓
5. User crea Booking para un Space
   ↓
6. Sistema crea Payment para el Booking
   ↓
7. User completa la reserva
   ↓
8. User deja Rating para la Company
   ↓
9. Company y User recibe Notification
```

---

**Última actualización:** 2026-02-07
**Versión:** 2.0 (Post-Estandarización)

# Guía de Despliegue — Booking Sport

Documentación del proceso de despliegue del sistema en producción.

---

## Infraestructura

| Componente | Servicio | Detalles |
|------------|----------|----------|
| VPS | Elastika | 2GB RAM, Ubuntu, IP: 38.250.116.248 |
| Backend | Node.js + PM2 | Puerto 5010, proxy via Nginx |
| Base de datos | PostgreSQL | Corre en el mismo VPS |
| Cache | Redis | Deshabilitado (modo nube disponible) |
| Frontend | Vercel | Deploy automático desde GitHub |
| Dominio | Hostinger | redepor.com |
| SSL | Let's Encrypt | Certbot, renovación automática |

---

## 1. Conexión al VPS

```bash
ssh root@38.250.116.248
# Password: ver credenciales seguras
```

---

## 2. Preparación del servidor (solo primera vez)

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Instalar Redis
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Instalar PM2 (gestor de procesos)
npm install -g pm2

# Instalar Nginx y Certbot
apt install -y nginx certbot python3-certbot-nginx git
```

---

## 3. Base de datos PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER booking_admin WITH PASSWORD 'tu_password';
CREATE DATABASE db_booking_sport OWNER booking_admin;
GRANT ALL PRIVILEGES ON DATABASE db_booking_sport TO booking_admin;
\q
```

### Conectarse desde cliente externo (TablePlus / DBeaver)

Usar **SSH Tunnel** en el cliente:

| Campo | Valor |
|-------|-------|
| SSH Host | 38.250.116.248 |
| SSH Port | 22 |
| SSH User | root |
| SSH Password | ver credenciales |
| DB Host | localhost |
| DB Port | 5432 |
| DB User | booking_admin |
| DB Name | db_booking_sport |

> PostgreSQL no está expuesto a internet — el SSH Tunnel conecta internamente.

---

## 4. Deploy del Backend

### Clonar repositorio

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Nicko-rgb/BACKEND_BOOKING.git
cd BACKEND_BOOKING
```

### Crear archivo `.env`

```bash
nano .env
```

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_booking_sport
DB_USER=booking_admin
DB_PASSWORD=tu_password

# Sincronización — false en producción estable
DB_FORCE_SYNC=false
DB_ALTER_SYNC=false

# Seeds — true solo la primera vez para poblar datos esenciales
SEED_INITIAL_DATA=false

# Servidor
PORT=5010
HOST=0.0.0.0
NODE_ENV=production

# JWT
JWT_SECRET=tu_jwt_secret_seguro
JWT_EXPIRES=12h

# CORS — apuntar al dominio del frontend
FRONTEND_URL=https://www.redepor.com
CORS_ORIGIN=https://www.redepor.com,https://redepor.com

# Redis — deshabilitado por ahora
REDIS_ENABLED=false
REDIS_URL=
REDIS_TTL=3600

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
```

### Instalar dependencias e iniciar

```bash
npm install --omit=dev
pm2 start server.js --name booking-backend
pm2 save
pm2 startup   # ejecutar el comando que PM2 muestre
```

### Primera vez — poblar datos esenciales

```bash
# Activar seeds esenciales (roles, permisos, países, deportes, tipos de pago)
# Editar .env: SEED_INITIAL_DATA=true
pm2 restart booking-backend --update-env
pm2 logs booking-backend --lines 30

# Cuando termine, desactivar
# Editar .env: SEED_INITIAL_DATA=false
pm2 restart booking-backend --update-env
```

> Los seeds de demo (empresas, sucursales, espacios) **nunca corren en producción**
> gracias a la separación en `src/database/seederRunner.js`.

---

## 5. Nginx como Reverse Proxy

### Configurar sitio

```bash
nano /etc/nginx/sites-available/api.redepor.com
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.redepor.com;

    location / {
        proxy_pass http://localhost:5010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/api.redepor.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 6. SSL con Let's Encrypt

### Obtener certificado

```bash
certbot --nginx -d api.redepor.com
# Elegir opción 2 (redirect HTTP → HTTPS) dos veces
```

Certbot modifica el config de Nginx automáticamente.
El certificado **se renueva automáticamente** cada 90 días.

### Verificar

```bash
curl https://api.redepor.com/health
# Debe responder: {"status":"OK","timestamp":"..."}
```

---

## 7. DNS en Hostinger

Registros configurados en el panel DNS de Hostinger:

| Tipo | Nombre | Valor | Descripción |
|------|--------|-------|-------------|
| `A` | `@` | `216.198.79.1` | redepor.com → Vercel |
| `CNAME` | `www` | `cname.vercel-dns.com` | www → Vercel |
| `A` | `api` | `38.250.116.248` | api.redepor.com → VPS |

---

## 8. Deploy del Frontend en Vercel

### Configurar proyecto

1. Vercel → **Add New Project** → importar `FRONTEND_BOOKING`
2. Vite se detecta automáticamente

### Variables de entorno en Vercel

```
VITE_API_URL=https://api.redepor.com/api
VITE_GOOGLE_CLIENT_ID=tu_google_client_id
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### Dominio personalizado

Vercel → Settings → Domains → agregar:
- `redepor.com`
- `www.redepor.com`

### Deploy automático

Cada `git push` a `main` dispara un nuevo deploy automáticamente.

---

## 9. Google OAuth

En [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → tu OAuth Client:

**Authorized JavaScript origins:**
```
https://redepor.com
https://www.redepor.com
```

**Authorized redirect URIs:**
```
https://redepor.com
https://www.redepor.com
```

---

## 10. Firewall — Elastika

Reglas configuradas en el panel Firewall de Elastika:

| Direction | IP Type | Decision | Protocol | Port |
|-----------|---------|----------|----------|------|
| IN | IPv4 | ACCEPT | TCP | 22 |
| IN | IPv4 | ACCEPT | TCP | 80 |
| IN | IPv4 | ACCEPT | TCP | 443 |

---

## 11. Comandos útiles en el VPS

```bash
# Ver estado del backend
pm2 status

# Ver logs en tiempo real
pm2 logs booking-backend

# Limpiar logs históricos
pm2 flush booking-backend

# Reiniciar (sin recargar .env)
pm2 restart booking-backend

# Reiniciar cargando nuevas variables de entorno
pm2 restart booking-backend --update-env

# Actualizar código desde GitHub
cd /var/www/BACKEND_BOOKING
git pull
npm install --omit=dev
pm2 restart booking-backend

# Ver estado de Nginx
systemctl status nginx

# Recargar Nginx sin cortar conexiones
systemctl reload nginx

# Renovar certificado SSL manualmente
certbot renew --dry-run
```

---

## 12. Arquitectura general

```
Usuario
  │
  ├── https://redepor.com  ──────→  Vercel (Frontend React/Vite)
  │                                        │
  │                                        │ HTTPS
  │                                        ↓
  └── https://api.redepor.com ──→  Nginx (VPS: 38.250.116.248)
                                           │
                                           │ proxy localhost:5010
                                           ↓
                                   PM2 → Node.js / Express
                                           │
                                           ├──→ PostgreSQL (localhost:5432)
                                           ├──→ Redis (deshabilitado)
                                           └──→ Socket.IO
```

---

## 13. Notas importantes

- `DB_FORCE_SYNC=true` está **bloqueado en producción** por código en `server.js` para evitar pérdida de datos.
- Los seeds de demo (empresas, sucursales, espacios) **no corren en producción** — ver `src/database/seederRunner.js`.
- El frontend corre en HTTPS (Vercel) y el backend en HTTPS (Nginx + Let's Encrypt) — sin problemas de mixed content.
- El VPS no expone PostgreSQL ni Redis a internet — solo puertos 22, 80 y 443.

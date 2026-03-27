# Booking Sport - Server

Servidor backend para la aplicación de reservas deportivas con autenticación de usuarios.

## Configuración Inicial

### 1. Crear archivo .env

Crea un archivo `.env` en la raíz del servidor con la siguiente configuración:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_sport
DB_USER=postgres
DB_PASSWORD=

# Server Configuration
PORT=5010
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES=24h
```

### 2. Crear la base de datos

En PostgreSQL, crea la base de datos:

```sql
CREATE DATABASE db_sport;
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Iniciar el servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## Características

- ✅ Autenticación JWT
- ✅ Encriptación de contraseñas con bcrypt
- ✅ Validación de datos con Sequelize
- ✅ Middleware de seguridad (Helmet, Rate Limiting)
- ✅ CORS configurado
- ✅ Manejo de errores global
- ✅ Sincronización automática de modelos
- ✅ Logs informativos

## Respuestas de la API

Todas las respuestas siguen este formato:

```javascript
// Respuesta exitosa
{
    "success": true,
    "data": { ... },
    "message": "Operación exitosa",
    "timestamp": "2024-01-15T10:30:00Z"
}

// Respuesta de error
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Datos inválidos",
        "details": { ... }
    },
    "message": "Error de operación",
    "timestamp": "2024-01-15T10:30:00Z" 
}
```

## Próximos Pasos

1. LOS CAMPOS "is_enabled" deben ser booleano

const { createClient } = require('redis');
const chalk = require('chalk');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isEnabled = process.env.REDIS_ENABLED === 'true';
        this.connectionAttempted = false;
    }

    async connect() {
        if (!this.isEnabled) {
            console.log(chalk.yellow('⚠️  Redis está deshabilitado en las variables de entorno'));
            return;
        }

        if (this.connectionAttempted) return;
        this.connectionAttempted = true;

        try {
            this.client = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            console.error(chalk.red('❌ Abandonando intentos de conexión a Redis después de 3 intentos'));
                            return new Error('No se pudo conectar a Redis después de múltiples intentos');
                        }
                        return Math.min(retries * 100, 3000);
                    },
                    timeout: 5000
                }
            });

            this.client.on('error', (err) => {
                if (err.code === 'ECONNREFUSED') {
                    console.warn(chalk.yellow('⚠️  Redis no está disponible. La aplicación continuará sin caching.'));
                } else {
                    console.error(chalk.red('❌ Error de Redis:'), err.message);
                }
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log(chalk.green('✅ Conectado a Redis'));
                this.isConnected = true;
            });

            await this.client.connect();
        } catch (error) {
            console.warn(chalk.yellow('⚠️  No se pudo conectar a Redis. La aplicación continuará sin caching.'));
            this.isConnected = false;
        }
    }

    async get(key) {
        try {
            if (!this.isConnected || !this.client) {
                return null;
            }
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(chalk.red('❌ Error al obtener dato de Redis:'), error.message);
            return null;
        }
    }

    async set(key, value, ttl = 3600) {
        try {
            if (!this.isConnected || !this.client) {
                return false;
            }
            await this.client.set(key, JSON.stringify(value), { EX: ttl });
            return true;
        } catch (error) {
            console.error(chalk.red('❌ Error al guardar dato en Redis:'), error.message);
            return false;
        }
    }

    async del(key) {
        try {
            if (!this.isConnected || !this.client) {
                return false;
            }
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error(chalk.red('❌ Error al eliminar dato de Redis:'), error.message);
            return false;
        }
    }

    async delByPattern(pattern) {
        try {
            if (!this.isConnected || !this.client) {
                return false;
            }
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            console.error(chalk.red('❌ Error al eliminar datos por patrón en Redis:'), error.message);
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.disconnect();
                this.isConnected = false;
                console.log(chalk.yellow('⚠️  Desconectado de Redis'));
            }
        } catch (error) {
            console.error(chalk.red('❌ Error al desconectar de Redis:'), error.message);
        }
    }
}

// Exportar instancia singleton
const redisClient = new RedisClient();
module.exports = redisClient;

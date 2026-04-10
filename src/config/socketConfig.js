const { Server } = require('socket.io');
const chalk = require('chalk');

let io;

/**
 * Inicializa Socket.IO con el servidor HTTP.
 * Si Redis está habilitado, conecta el Redis adapter para soportar
 * múltiples instancias del servidor (escalado horizontal).
 * @param {import('http').Server} server
 */
const initSocket = async (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Redis adapter — necesario para que los eventos de socket se propaguen
    // entre múltiples instancias del servidor detrás de un load balancer.
    // Si Redis no está disponible, Socket.IO funciona en modo single-server.
    if (process.env.REDIS_ENABLED === 'true' && process.env.REDIS_URL) {
        try {
            const { createAdapter } = require('@socket.io/redis-adapter');
            const { createClient } = require('redis');

            // Pub/sub requiere conexiones dedicadas — no reutilizar el cliente principal
            const pubClient = createClient({ url: process.env.REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));

            console.log(chalk.green('✅ Socket.IO conectado con Redis adapter (modo multi-servidor)'));
        } catch (error) {
            // No bloquear el arranque si Redis falla — degradar a single-server
            console.warn(chalk.yellow(`⚠️  Redis adapter no disponible. Socket.IO en modo single-server. (${error.message})`));
        }
    }

    io.on('connection', (socket) => {
        console.log(`🔌 Usuario conectado: ${socket.id}`);

        // Unirse a una sala específica por espacio + fecha
        // Recibe { spaceId, date } → sala "space:42:2026-03-01"
        socket.on('join_space', ({ spaceId, date } = {}) => {
            if (!spaceId || !date) return;
            const room = `space:${String(spaceId)}:${date}`;
            socket.join(room);
            console.log(chalk.blue(`📡 [Socket] ${socket.id} se unió a la sala: ${room}`));
            socket.emit('join_space_success', { room, socketId: socket.id });
        });

        // Salir de una sala por espacio + fecha
        socket.on('leave_space', ({ spaceId, date } = {}) => {
            if (!spaceId || !date) return;
            const room = `space:${String(spaceId)}:${date}`;
            socket.leave(room);
            console.log(chalk.yellow(`📡 [Socket] ${socket.id} salió de la sala: ${room}`));
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Usuario desconectado: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Obtiene la instancia de io ya inicializada
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO no ha sido inicializado!');
    }
    return io;
};

module.exports = { initSocket, getIO };
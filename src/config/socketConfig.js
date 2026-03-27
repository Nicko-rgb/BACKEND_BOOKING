const { Server } = require('socket.io');
const chalk = require('chalk');

let io;

/**
 * Inicializa Socket.IO con el servidor HTTP
 */
const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

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
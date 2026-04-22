/**
 * Modelo Rating - Gestión de calificaciones y reseñas
 * 
 * Este modelo almacena las calificaciones y comentarios que los usuarios
 * realizan sobre las instalaciones deportivas después de usar sus servicios.
 * Permite un sistema de reputación y feedback para mejorar la calidad del servicio.
 * 
 * Relaciones:
 * - Pertenece a un User (usuario que califica y evalua la reseña)
 * - Pertenece a una sucursal deportiva (Company)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Rating = sequelize.define('Rating', {
    rating_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la calificación'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'ID del usuario que realiza la calificación'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        },
        comment: 'ID de la sucursal deportiva calificada'
    },
    booking_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'ID de la reserva asociada a la calificación'
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        },
        comment: 'Puntuación de 1 a 5 estrellas'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Título de la reseña'
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comentario detallado del usuario'
    },
    pros: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Aspectos positivos mencionados'
    },
    cons: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Aspectos negativos mencionados'
    },
    would_recommend: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        comment: 'Si recomendaría la instalación'
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada', 'reportada'),
        defaultValue: 'pendiente',
        comment: 'Estado de moderación de la reseña, pendiente del administrador'
    },
    moderated_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'ID del moderador que revisó la reseña',
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        }
    },
    moderated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de moderación'
    },
    rated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación de la calificación'
    }
}, {
    tableName: 'dsg_bss_ratings', // Tabla: calificaciones y reseñas
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla de calificaciones y reseñas sobre sucursales o reservas',
    indexes: [
        // Índice compuesto para listar reseñas aprobadas de una sucursal ──────────────
        {
            name: 'idx_rating_sucursal_status',
            fields: ['sucursal_id', 'status']
        },
        // Índice para listar reseñas de un usuario ────────────────────────────────────
        {
            name: 'idx_rating_user_id',
            fields: ['user_id']
        },
        // Índice para vincular rating con su reserva ───────────────────────────────────
        {
            name: 'idx_rating_booking_id',
            fields: ['booking_id']
        }
    ]
});

// Definir asociaciones
Rating.associate = function (models) {
    // Pertenece a un usuario
    Rating.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // Pertenece a una instalación (sucursal/empresa)
    Rating.belongsTo(models.Company, {
        foreignKey: 'sucursal_id',
        as: 'sucursal'
    });

    // Puede pertenecer a una reserva
    Rating.belongsTo(models.Booking, {
        foreignKey: 'booking_id',
        as: 'booking'
    });
};

module.exports = Rating;
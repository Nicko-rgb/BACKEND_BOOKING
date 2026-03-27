/** Esto sirve para hacer manejar rutas protegidas en el servidor
*   en el cliente se debe usar una instance de axios "axiosInstance"
*   que este enviará en los encabezados el token de autenticacion al servidor
**/

const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/ApiResponse')
const verificarTokenAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ApiResponse.error(req, res, 'AUTHENTICATION_REQUIRED', 'No autorizado. Token no proporcionado.', null, 401)
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.error(req, res, 'TOKEN_EXPIRED', 'Token expirado. Vuelve a iniciar sesión.', null, 401)
        }
        return ApiResponse.error(req, res, 'INVALID_TOKEN', 'Token inválido o expirado. Vuelve a iniciar sesión.', null, 401)
    }
};

module.exports = {
    verificarTokenAuth
}

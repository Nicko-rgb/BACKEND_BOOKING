// /modules/users/handlers/UserHandler.js
const userService = require('../services/UserService');
const { UserDto } = require('../dto/UserDto');
const { extractUserContext } = require('../../../shared/utils/extractUserContext');
const ApiResponse = require('../../../shared/utils/ApiResponse')

// LAS RESPUESTAS QUE SE ENVIAN AL CLIENTE 

// Respuesta de registro de usuario
const createUserHandler = async (res, userData) => {
    const newUser = await userService.createNewUser(userData);
    const data = UserDto.toLoginResponse(newUser)
    return ApiResponse.created(res, data, 'Usuario creado exitosamente')
};

// Respuesta de inicio de sesión — portal Booking Sport (clientes)
const loginUserHandler = async (res, loginData) => {
    const loginResult = await userService.loginUser(loginData);
    const data = UserDto.toLoginResponse(loginResult);
    return ApiResponse.ok(res, data, 'Inicio de sesión exitoso.');
};

// Respuesta de inicio de sesión — módulo administrador
const loginAdminHandler = async (res, loginData) => {
    const loginResult = await userService.loginAdmin(loginData);
    const data = UserDto.toAdminLoginResponse(loginResult);
    return ApiResponse.ok(res, data, 'Inicio de sesión en módulo administrador exitoso.');
};

// Respuesta de autenticación social
const socialLoginHandler = async (res, socialData) => {
    const loginResult = await userService.socialLogin(socialData);
    const data = UserDto.toSocialLoginResponse(loginResult)
    return ApiResponse.ok(res, data, 'Autenticación social exitosa.')
};

// Respuesta de obtencion de todos los usuarios
const getAllUsersHandler = async (res, filters) => {
    const usersData = await userService.getAllUsers(filters);
    const response = {
        users: usersData.users.map(user => UserDto.toUserResponse(user)),
        pagination: usersData.pagination,
        stats: usersData.stats
    };
    
    return ApiResponse.ok(res, response.users, 'Usuarios obtenidos exitosamente.', 200, { pagination: response.pagination, stats: response.stats })
};

// Registro de usuario admin (super_admin / administrador / empleado)
const registerAdminUserHandler = async (res, userData, req) => {
    // role es string varchar — se pasa directo (registerAdminUser valida la jerarquía)
    const { role, user_id } = extractUserContext(req);
    const newUser = await userService.registerAdminUser(userData, role, user_id);
    const data = UserDto.toUserResponse(newUser);
    return ApiResponse.created(res, data, 'Usuario registrado exitosamente');
};

// Obtener usuarios asignados a una empresa o sucursal
const getUsersByCompanyHandler = async (res, companyId) => {
    const assignments = await userService.getUsersByCompany(companyId);
    const data = assignments.map(a => UserDto.toCompanyUserResponse(a));
    return ApiResponse.ok(res, data, 'Usuarios obtenidos');
};

// Todo el staff del tenant (admins + empleados de todas las sucursales)
const getTenantStaffHandler = async (res, companyId) => {
    const assignments = await userService.getTenantStaff(companyId);
    const data = assignments.map(a => UserDto.toCompanyUserResponse(a));
    return ApiResponse.ok(res, data, 'Staff del tenant obtenido');
};

// Visión global del staff (propietarios + administradores) — solo system
const getStaffOverviewHandler = async (res, filters) => {
    const result = await userService.getStaffOverview(filters);
    const staff = result.staff.map(a => UserDto.toStaffItem(a));
    return ApiResponse.ok(res, staff, 'Staff obtenido exitosamente.', 200, { pagination: result.pagination });
};

// Actualizar datos básicos de un usuario staff
const updateStaffUserHandler = async (res, userId, data) => {
    const user = await userService.updateStaffUser(userId, data);
    const response = {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
    };
    return ApiResponse.ok(res, response, 'Usuario actualizado exitosamente.');
};

// Cierra sesión invalidando el token actual en la blacklist de Redis
const logoutHandler = async (res, token) => {
    await userService.logoutUser(token);
    return ApiResponse.ok(res, null, 'Sesión cerrada correctamente.');
};

module.exports = {
    createUserHandler,
    loginUserHandler,
    loginAdminHandler,
    socialLoginHandler,
    getAllUsersHandler,
    registerAdminUserHandler,
    getUsersByCompanyHandler,
    getTenantStaffHandler,
    getStaffOverviewHandler,
    updateStaffUserHandler,
    logoutHandler
};

const nodemailer = require('nodemailer');

// Crear el transportador SMTP
// Por defecto configurado para Gmail, pero funciona con cualquier proveedor SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === '465', // true para puerto 465, false para otros (587)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Envía el correo de recuperación de contraseña
 * @param {string} to - Correo del destinatario
 * @param {string} resetLink - Enlace con el token JWT
 */
const sendPasswordResetEmail = async (to, resetLink) => {
    // Si no hay credenciales configuradas, solo loguear (modo desarrollo fallback)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ Credenciales SMTP no configuradas. El correo no se enviará realmente.');
        console.log(`\n=== ✉️ MOCK EMAIL ===\nPara: ${to}\nLink: ${resetLink}\n=====================\n`);
        return true;
    }

    const mailOptions = {
        from: `"BOOKING SPORT" <${process.env.SMTP_USER}>`,
        to: to,
        subject: 'Recuperación de Contraseña - BOOKING SPORT',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; text-align: center;">Recuperación de Contraseña</h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                    Has solicitado restablecer tu contraseña en <strong>Booking Sport</strong>. Haz clic en el botón de abajo para crear una nueva contraseña:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2c9d75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                        Restablecer mi Contraseña
                    </a>
                </div>
                <p style="color: #64748b; font-size: 14px; text-align: center;">
                    <em>Este enlace es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</em>
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Booking Sport. Todos los derechos reservados.
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Correo enviado: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error enviando correo:', error);
        throw new Error('No se pudo enviar el correo de recuperación.');
    }
};

/**
 * Envía el correo de bienvenida al cliente SaaS
 * @param {string} to - Correo del dueño/administrador
 * @param {string} name - Nombre del administrador
 * @param {string} companyName - Nombre de la empresa registrada
 */
const sendWelcomeSaaSClientEmail = async (to, name, companyName) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ Credenciales SMTP no configuradas. El correo no se enviará realmente.');
        console.log(`\n=== ✉️ MOCK WELCOME EMAIL ===\nPara: ${to}\nNombre: ${name}\nEmpresa: ${companyName}\n=============================\n`);
        return true;
    }

    const adminPanelUrl = process.env.FRONT_ADMIN_BOOKING || 'http://localhost:3000';

    const mailOptions = {
        from: `"BOOKING SPORT" <${process.env.SMTP_USER}>`,
        to: to,
        subject: '¡Bienvenido a Booking Sport! Tu cuenta está activa',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #2c9d75; text-align: center;">¡Felicidades, ${name}!</h2>
                <h3 style="color: #0f172a; text-align: center; margin-top: 0;">Tu cuenta para <strong>${companyName}</strong> ya está activa</h3>
                <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                    Tu suscripción ha sido confirmada con éxito. Ya puedes ingresar al panel administrativo para configurar tus sucursales, deportes y canchas para empezar a recibir reservas.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${adminPanelUrl}" style="background-color: #2c9d75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                        Ingresar al Panel de Administrador
                    </a>
                </div>
                <p style="color: #475569; font-size: 14px;">
                    Usa el correo electrónico con el que te registraste (<strong>${to}</strong>) y la contraseña elegida para iniciar sesión.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Booking Sport. Todos los derechos reservados.
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Correo de bienvenida enviado: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error enviando correo de bienvenida:', error);
        return false; // Retornar false pero no bloquear el webhook si falla el envío de mail
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeSaaSClientEmail
};
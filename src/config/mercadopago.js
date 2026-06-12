const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: { timeout: 10000 }
});

module.exports = { client, Payment };

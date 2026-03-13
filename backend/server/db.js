const mysql = require('mysql2');
require('dotenv').config();

console.log(`📡 Attempting to connect to DB at: ${process.env.DB_HOST || 'NOT SET'}:${process.env.DB_PORT || '4000'}`);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'test',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();

const db = require('./db');
require('dotenv').config();

async function addStatusColumn() {
    try {
        console.log('Checking if "status" column exists in "events" table...');
        const [rows] = await db.execute('DESCRIBE events');
        const hasStatus = rows.some(row => row.Field === 'status');

        if (hasStatus) {
            console.log('"status" column already exists.');
        } else {
            console.log('Adding "status" column to "events" table...');
            await db.execute('ALTER TABLE events ADD COLUMN status VARCHAR(20) DEFAULT "active"');
            console.log('"status" column added successfully.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error adding column:', err);
        process.exit(1);
    }
}

addStatusColumn();

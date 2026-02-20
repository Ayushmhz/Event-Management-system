const db = require('./db');
require('dotenv').config();

async function addFacultyColumn() {
    try {
        console.log('Checking if "faculty" column exists in "users" table...');
        const [rows] = await db.execute('DESCRIBE users');
        const hasFaculty = rows.some(row => row.Field === 'faculty');

        if (hasFaculty) {
            console.log('"faculty" column already exists.');
        } else {
            console.log('Adding "faculty" column to "users" table...');
            await db.execute('ALTER TABLE users ADD COLUMN faculty VARCHAR(50) DEFAULT NULL');
            console.log('"faculty" column added successfully.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error adding column:', err);
        process.exit(1);
    }
}

addFacultyColumn();

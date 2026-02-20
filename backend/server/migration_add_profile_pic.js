const db = require('./db');
require('dotenv').config();

async function addProfilePicColumn() {
    try {
        console.log('Checking if "profile_pic" column exists in "users" table...');
        const [rows] = await db.execute('DESCRIBE users');
        const hasProfilePic = rows.some(row => row.Field === 'profile_pic');

        if (hasProfilePic) {
            console.log('"profile_pic" column already exists.');
        } else {
            console.log('Adding "profile_pic" column to "users" table...');
            await db.execute('ALTER TABLE users ADD COLUMN profile_pic VARCHAR(255) DEFAULT NULL');
            console.log('"profile_pic" column added successfully.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error adding column:', err);
        process.exit(1);
    }
}

addProfilePicColumn();

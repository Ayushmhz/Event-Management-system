const db = require('./server/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        // ID 2 is Ayush Mhz
        const id = 2;
        const newPassword = 'password123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        console.log(`Password for user ID ${id} (Ayush Mhz) reset to: ${newPassword}`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetPassword();

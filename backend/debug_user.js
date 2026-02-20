const db = require('./server/db');

async function checkUser() {
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE fullname LIKE ?', ['%ayush%']);
        console.log('Users found:', rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();

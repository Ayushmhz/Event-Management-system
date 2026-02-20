const db = require('./server/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add image_url if not exists
        try {
            await db.execute('ALTER TABLE events ADD COLUMN image_url VARCHAR(255) DEFAULT "https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"');
            console.log('Added image_url column.');
        } catch (e) {
            console.log('image_url column might already exist or error:', e.message);
        }

        // Add registration_deadline if not exists
        try {
            await db.execute('ALTER TABLE events ADD COLUMN registration_deadline DATE');
            console.log('Added registration_deadline column.');
        } catch (e) {
            console.log('registration_deadline column might already exist or error:', e.message);
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();

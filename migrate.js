import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the SQLite database for migration.');
        runMigration();
    }
});

function runMigration() {
    console.log('🔄 Starting database migration...');

    db.serialize(() => {
        // Add new columns to users table
        console.log('📝 Migrating users table...');
        db.run("ALTER TABLE users ADD COLUMN hashed_password TEXT", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE users ADD COLUMN email TEXT", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE users ADD COLUMN last_login DATETIME", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });

        // Add new columns to inventory table
        console.log('📝 Migrating inventory table...');
        db.run("ALTER TABLE inventory ADD COLUMN reorder_point INTEGER DEFAULT 10", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE inventory ADD COLUMN reorder_qty INTEGER DEFAULT 20", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE inventory ADD COLUMN supplier_name TEXT", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE inventory ADD COLUMN supplier_email TEXT", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE inventory ADD COLUMN unit_cost REAL", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });
        db.run("ALTER TABLE inventory ADD COLUMN last_ordered_date DATETIME", (err) => {
            if (err && !err.message.includes('duplicate column')) console.log('Note:', err.message);
        });

        // Create new tables if they don't exist
        console.log('📝 Creating new tables...');

        db.run(`CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            table_name TEXT,
            record_id INTEGER,
            changes TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.log('Note:', err.message);
            else console.log('✅ audit_log table ready');
        });

        db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            po_number TEXT UNIQUE,
            supplier_name TEXT,
            status TEXT DEFAULT 'Draft',
            order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            expected_delivery DATETIME,
            total_cost REAL,
            notes TEXT,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`, (err) => {
            if (err) console.log('Note:', err.message);
            else console.log('✅ purchase_orders table ready');
        });

        db.run(`CREATE TABLE IF NOT EXISTS po_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            po_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            unit_cost REAL,
            FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
            FOREIGN KEY (product_id) REFERENCES inventory(id)
        )`, (err) => {
            if (err) console.log('Note:', err.message);
            else console.log('✅ po_items table ready');
        });

        db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            movement_type TEXT,
            quantity INTEGER,
            reference_type TEXT,
            reference_id INTEGER,
            performed_by INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            FOREIGN KEY (product_id) REFERENCES inventory(id),
            FOREIGN KEY (performed_by) REFERENCES users(id)
        )`, (err) => {
            if (err) console.log('Note:', err.message);
            else console.log('✅ stock_movements table ready');
        });

        // Wait a bit for all migrations to complete
        setTimeout(() => {
            console.log('\n✅ Migration complete! Your database is now up to date.');
            console.log('🔄 Please restart the server now.');
            db.close();
            process.exit(0);
        }, 1000);
    });
}

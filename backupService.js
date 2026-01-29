import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_FILE = path.join(__dirname, 'inventory.db');

/**
 * Ensure backup directory exists
 */
const ensureBackupDir = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log('Created backup directory:', BACKUP_DIR);
    }
};

/**
 * Create a backup of the database
 */
export const createBackup = () => {
    try {
        ensureBackupDir();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupFile = path.join(BACKUP_DIR, `inventory_backup_${timestamp}.db`);

        // Copy database file
        fs.copyFileSync(DB_FILE, backupFile);

        console.log(`✅ Database backup created: ${backupFile}`);

        // Clean up old backups
        cleanOldBackups();

        return backupFile;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        return null;
    }
};

/**
 * Delete backups older than retention period
 */
const cleanOldBackups = () => {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const retentionMs = config.backupRetentionDays * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const fileAge = now - stats.mtimeMs;

            if (fileAge > retentionMs) {
                fs.unlinkSync(filePath);
                console.log(`🗑️  Deleted old backup: ${file}`);
            }
        });
    } catch (error) {
        console.error('Error cleaning old backups:', error);
    }
};

/**
 * List all available backups
 */
export const listBackups = () => {
    try {
        ensureBackupDir();
        const files = fs.readdirSync(BACKUP_DIR);

        return files
            .filter(file => file.endsWith('.db'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.mtime
                };
            })
            .sort((a, b) => b.created - a.created);
    } catch (error) {
        console.error('Error listing backups:', error);
        return [];
    }
};

/**
 * Restore database from backup
 */
export const restoreBackup = (backupFilename) => {
    try {
        const backupPath = path.join(BACKUP_DIR, backupFilename);

        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not found');
        }

        // Create a backup of current database before restoring
        const currentBackup = createBackup();

        // Restore from backup
        fs.copyFileSync(backupPath, DB_FILE);

        console.log(`✅ Database restored from: ${backupFilename}`);
        console.log(`📦 Previous database backed up as: ${path.basename(currentBackup)}`);

        return true;
    } catch (error) {
        console.error('❌ Restore failed:', error);
        return false;
    }
};

/**
 * Start automated backup scheduler
 */
export const startBackupScheduler = () => {
    if (!config.backupEnabled) {
        console.log('📦 Automated backups are disabled');
        return;
    }

    // Schedule daily backup at midnight
    cron.schedule(config.backupSchedule, () => {
        console.log('🕐 Running scheduled backup...');
        createBackup();
    });

    console.log(`📦 Backup scheduler started: ${config.backupSchedule}`);
    console.log(`📦 Retention period: ${config.backupRetentionDays} days`);

    // Create initial backup on startup
    console.log('📦 Creating initial backup...');
    createBackup();
};

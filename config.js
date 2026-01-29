// Environment Configuration
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: '8h', // Token expires in 8 hours

    // Server Config
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Backup Config
    backupEnabled: process.env.BACKUP_ENABLED !== 'false',
    backupSchedule: process.env.BACKUP_SCHEDULE || '0 0 * * *', // Daily at midnight
    backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 7,

    // Rate Limiting
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: 5000 // Max 5000 requests per window
};

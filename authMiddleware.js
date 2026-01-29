import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import prisma from './lib/prisma.js';

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role
    };

    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn
    });
};

/**
 * Verify JWT token and extract user info
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (error) {
        return null;
    }
};

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

/**
 * Compare password with hashed password
 */
export const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

/**
 * Middleware to verify JWT token from request
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    const user = verifyToken(token);
    if (!user) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * Log user action to audit trail
 */
export const logAudit = async (userId, action, tableName, recordId, changes = null, ipAddress = null) => {
    const changesJson = changes ? JSON.stringify(changes) : null;

    try {
        await prisma.auditLog.create({
            data: {
                user_id: userId,
                action,
                table_name: tableName,
                record_id: recordId,
                changes: changesJson,
                ip_address: ipAddress
            }
        });
    } catch (err) {
        console.error('Audit log error:', err);
    }
};

/**
 * Update user's last login timestamp
 */
export const updateLastLogin = async (userId) => {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { last_login: new Date() }
        });
    } catch (err) {
        console.error('Failed to update last login:', err);
    }
};

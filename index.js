import { config } from './config.js';
import dotenv from 'dotenv';
dotenv.config(); // Double ensure it runs ideally before anything else if config.js failed
console.log("DEBUG: DATABASE_URL is", process.env.DATABASE_URL);

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import prisma from './lib/prisma.js';
import { saveToGoogleSheet } from './googleSheetsService.js';
import {
    generateToken,
    comparePassword,
    hashPassword,
    authenticateToken,
    requireAdmin,
    logAudit,
    updateLastLogin
} from './authMiddleware.js';
import { startBackupScheduler, createBackup, listBackups, restoreBackup } from './backupService.js';
import { checkLowStock, autoGeneratePurchaseOrders, startReorderScheduler, logStockMovement } from './automationService.js';
import QRCode from 'qrcode';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Start automated services
console.log('🚀 Starting automated services...');
startBackupScheduler();
startReorderScheduler();

// ==================== AUTH ENDPOINTS ====================

// Login with JWT
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const row = await prisma.user.findUnique({
            where: { username }
        });

        if (!row || !row.is_active) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check password (support both old plain text and new hashed)
        let isValid = false;
        if (row.hashed_password) {
            isValid = await comparePassword(password, row.hashed_password);
        } else if (row.password) {
            // Legacy plain text password - check and migrate
            isValid = row.password === password;
            if (isValid) {
                // Migrate to hashed password
                const hashed = await hashPassword(password);
                await prisma.user.update({
                    where: { id: row.id },
                    data: { hashed_password: hashed }
                });
            }
        }

        if (isValid) {
            const token = generateToken(row);
            updateLastLogin(row.id);

            // Log Login Session
            const userAgent = req.headers['user-agent'] || 'Unknown';
            try {
                await prisma.userSession.create({
                    data: {
                        user_id: row.id,
                        ip_address: req.ip,
                        user_agent: userAgent
                    }
                });
            } catch (sessionErr) {
                console.error("Error creating session:", sessionErr);
            }

            logAudit(row.id, 'LOGIN', 'users', row.id, null, req.ip);

            res.json({
                message: "Login success",
                token,
                user: {
                    id: row.id,
                    username: row.username,
                    role: row.role,
                    email: row.email
                }
            });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create New User (Admin Only)
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role, email } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        const hashedPassword = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: role || 'user',
                is_active: true,
                hashed_password: hashedPassword
            }
        });

        logAudit(req.user.id, 'CREATE_USER', 'users', newUser.id, { username, role, email }, req.ip);
        res.json({ message: "User created successfully", id: newUser.id });

    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ error: "Username or Email already exists" });
        }
        res.status(500).json({ error: err.message });
    }
});

// Get All Users (Admin Only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                last_login: true,
                created_at: true,
                is_active: true
            }
        });
        res.json({ data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Logout Endpoint
app.post('/api/logout', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // Find the latest open session for this user
        const session = await prisma.userSession.findFirst({
            where: {
                user_id: userId,
                logout_time: null
            },
            orderBy: {
                login_time: 'desc'
            }
        });

        if (session) {
            const now = new Date();
            const duration = Math.round((now - new Date(session.login_time)) / 60000); // duration in minutes

            await prisma.userSession.update({
                where: { id: session.id },
                data: {
                    logout_time: now,
                    duration_minutes: duration
                }
            });
        }
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Error logging out session:", err);
        // Still return success to client
        res.json({ message: "Logged out successfully" });
    }
});

// ==================== INVENTORY ENDPOINTS ====================

// Get All Inventory
app.get('/api/inventory', authenticateToken, async (req, res) => {
    try {
        const rows = await prisma.inventory.findMany();
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Low Stock Items
app.get('/api/inventory/low-stock', authenticateToken, async (req, res) => {
    try {
        const lowStock = await checkLowStock();
        res.json({ data: lowStock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Inventory Item
app.post('/api/inventory', authenticateToken, async (req, res) => {
    const {
        product_name, qty, min_qty, reorder_point, reorder_qty,
        location_area, location, sub_location,
        supplier_name, supplier_email, unit_cost
    } = req.body;

    try {
        const newItem = await prisma.inventory.create({
            data: {
                product_name,
                qty: parseInt(qty),
                min_qty: min_qty || 10,
                reorder_point: reorder_point || 10,
                reorder_qty: reorder_qty || 20,
                location_area,
                location,
                sub_location,
                supplier_name,
                supplier_email,
                unit_cost: parseFloat(unit_cost)
            }
        });

        logAudit(req.user.id, 'CREATE', 'inventory', newItem.id, { product_name, qty }, req.ip);
        await logStockMovement(newItem.id, 'IN', qty, 'INITIAL', null, req.user.id, 'Initial stock');

        res.json({ message: "Item added", id: newItem.id });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Inventory Item
app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        product_name, qty, min_qty, reorder_point, reorder_qty,
        location_area, location, sub_location,
        supplier_name, supplier_email, unit_cost
    } = req.body;

    try {
        const oldRow = await prisma.inventory.findUnique({
            where: { id: parseInt(id) }
        });

        if (!oldRow) {
            return res.status(404).json({ error: "Item not found" });
        }

        const updatedItem = await prisma.inventory.update({
            where: { id: parseInt(id) },
            data: {
                product_name,
                qty: parseInt(qty),
                min_qty: parseInt(min_qty),
                reorder_point: parseInt(reorder_point),
                reorder_qty: parseInt(reorder_qty),
                location_area,
                location,
                sub_location,
                supplier_name,
                supplier_email,
                unit_cost: parseFloat(unit_cost)
            }
        });

        // Log quantity change as stock movement
        if (oldRow.qty !== parseInt(qty)) {
            const diff = parseInt(qty) - oldRow.qty;
            const movementType = diff > 0 ? 'IN' : 'OUT';
            await logStockMovement(parseInt(id), movementType, Math.abs(diff), 'ADJUSTMENT', null, req.user.id, 'Manual adjustment');
        }

        logAudit(req.user.id, 'UPDATE', 'inventory', id, { old: oldRow, new: req.body }, req.ip);
        res.json({ message: "Item updated", changes: 1 }); // Mocking changes count

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Inventory Item
app.delete('/api/inventory/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const row = await prisma.inventory.findUnique({ where: { id: parseInt(id) } });
        if (!row) return res.status(404).json({ error: "Item not found" });

        await prisma.inventory.delete({ where: { id: parseInt(id) } });

        logAudit(req.user.id, 'DELETE', 'inventory', id, row, req.ip);
        res.json({ message: "Item deleted", changes: 1 });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== PURCHASE ORDER ENDPOINTS ====================

// Get All Purchase Orders
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
    const { status } = req.query;

    try {
        const where = {};
        if (status) query.where = { status };

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: status ? { status } : {},
            include: {
                _count: {
                    select: { items: true }
                }
            },
            orderBy: {
                order_date: 'desc'
            }
        });

        // Flatten _count to item_count to match previous API response structure
        const formatted = purchaseOrders.map(po => ({
            ...po,
            item_count: po._count.items
        }));

        res.json({ data: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get PO Details with Items
app.get('/api/purchase-orders/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: parseInt(id) },
            include: {
                items: {
                    include: {
                        product: {
                            select: { product_name: true }
                        }
                    }
                }
            }
        });

        if (!po) return res.status(404).json({ error: "PO not found" });

        // Flatten items to include product_name at top level of item object if needed, 
        // but frontend likely can adapt or we map it.
        // Previous SQL join returned product_name in the item row.
        const items = po.items.map(item => ({
            ...item,
            product_name: item.product ? item.product.product_name : 'Unknown'
        }));

        // Remove items from po object to match previous structure { po, items }
        const { items: poItems, ...poData } = po;

        res.json({ po: poData, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Purchase Order
app.post('/api/purchase-orders', authenticateToken, async (req, res) => {
    const { supplier_name, expected_delivery, notes, items } = req.body;

    const poNumber = `PO-${Date.now()}`;
    const totalCost = items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);

    try {
        const newPO = await prisma.purchaseOrder.create({
            data: {
                po_number: poNumber,
                supplier_name,
                expected_delivery: expected_delivery ? new Date(expected_delivery) : null,
                total_cost: totalCost,
                notes,
                created_by: req.user.id,
                items: {
                    create: items.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_cost: item.unit_cost
                    }))
                }
            }
        });

        logAudit(req.user.id, 'CREATE', 'purchase_orders', newPO.id, { poNumber, supplier_name, items }, req.ip);
        res.json({ message: "PO created", id: newPO.id, poNumber });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Receive Purchase Order (Update inventory)
app.post('/api/purchase-orders/:id/receive', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const poId = parseInt(id);

    try {
        // Get PO items
        const items = await prisma.pOItem.findMany({
            where: { po_id: poId }
        });

        if (!items.length) {
            return res.status(400).json({ error: "PO has no items" });
        }

        // Use transaction to update inventory and PO status
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                // Update inventory
                await tx.inventory.update({
                    where: { id: item.product_id },
                    data: {
                        qty: { increment: item.quantity },
                        last_ordered_date: new Date()
                    }
                });

                // Log movement (using tx is hard with the helper function unless helper accepts tx, 
                // but stock movement log is distinct action. We can await helper here, but if tx fails, 
                // stock movement log persists if helper uses global prisma? 
                // Automation service helper uses global prisma. 
                // For strict correctness, we should inline creation here using tx.stockMovement.create)

                await tx.stockMovement.create({
                    data: {
                        product_id: item.product_id,
                        movement_type: 'IN',
                        quantity: item.quantity,
                        reference_type: 'PO',
                        reference_id: poId,
                        performed_by: req.user.id,
                        notes: `Received from PO-${id}`
                    }
                });
            }

            // Update PO status
            await tx.purchaseOrder.update({
                where: { id: poId },
                data: { status: 'Received' }
            });
        });

        logAudit(req.user.id, 'RECEIVE_PO', 'purchase_orders', poId, null, req.ip);
        res.json({ message: "PO received, inventory updated" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Auto-generate reorder POs
app.post('/api/automation/trigger-reorder', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const adminEmail = req.user.email || process.env.ADMIN_EMAIL;
        const result = await autoGeneratePurchaseOrders(adminEmail);
        logAudit(req.user.id, 'AUTO_REORDER', 'purchase_orders', null, result, req.ip);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STOCK MOVEMENT ENDPOINTS ====================

// Get Stock Movement History
app.get('/api/stock-movements', authenticateToken, async (req, res) => {
    const { product_id } = req.query;

    try {
        const movements = await prisma.stockMovement.findMany({
            where: product_id ? { product_id: parseInt(product_id) } : {},
            include: {
                product: {
                    select: { product_name: true }
                },
                user: {
                    select: { username: true }
                }
            },
            orderBy: {
                timestamp: 'desc'
            },
            take: 100
        });

        // Flatten response
        const formatted = movements.map(m => ({
            ...m,
            product_name: m.product ? m.product.product_name : 'Unknown',
            username: m.user ? m.user.username : 'Unknown'
        }));

        res.json({ data: formatted });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== MAINTENANCE LOG ENDPOINTS ====================

// ==================== MAINTENANCE LOG ENDPOINTS ====================

// Get Maintenance Logs
app.get('/api/logs', authenticateToken, async (req, res) => {
    try {
        const logs = await prisma.log.findMany({
            orderBy: { timestamp: 'desc' }
        });
        res.json({ data: logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Log (Admin only)
app.put('/api/logs/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { engineer, date_of_work, area, system, component, action, duration, work_status, remarks, spare_part_used, qty_used } = req.body;

    try {
        await prisma.log.update({
            where: { id: parseInt(id) },
            data: {
                engineer,
                date_of_work: date_of_work ? new Date(date_of_work) : null,
                area,
                system,
                component,
                action,
                duration: parseInt(duration),
                work_status,
                remarks,
                spare_part_used,
                qty_used: parseInt(qty_used)
            }
        });

        logAudit(req.user.id, 'UPDATE', 'logs', id, req.body, req.ip);
        res.json({ message: "Log updated", changes: 1 });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Log
// Delete Log (with Stock Reversal)
app.delete('/api/logs/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Fetch log to check for stock usage
        const log = await prisma.log.findUnique({ where: { id: parseInt(id) } });
        if (!log) return res.status(404).json({ error: "Log not found" });

        await prisma.$transaction(async (tx) => {
            // 2. Reverse Stock if applicable
            if (log.product_id && log.qty_used > 0 && log.action === 'Replaced') {
                // Restore inventory
                await tx.inventory.update({
                    where: { id: log.product_id },
                    data: { qty: { increment: log.qty_used } }
                });

                // Record Movement (Correction)
                await tx.stockMovement.create({
                    data: {
                        product_id: log.product_id,
                        movement_type: 'IN',
                        quantity: log.qty_used,
                        reference_type: 'Maintenance Correction',
                        reference_id: log.id, // ID will be deleted, but reference kept for audit? Or maybe reference deleted log ID.
                        performed_by: req.user.id,
                        notes: `Stock restored due to deletion of Log #${id}`
                    }
                });
                console.log(`Resource: Stock restored for Product ${log.product_id} (Qty: ${log.qty_used})`);
            }

            // 3. Delete the log
            await tx.log.delete({ where: { id: parseInt(id) } });

            // 4. Create Audit Log
            await tx.auditLog.create({
                data: {
                    user_id: req.user.id,
                    action: 'DELETE',
                    table_name: 'logs',
                    record_id: parseInt(id),
                    changes: JSON.stringify(log), // Store backup of deleted log
                    ip_address: req.ip
                }
            });
        });

        res.json({ message: "Log deleted and stock restored if applicable", changes: 1 });

    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Maintenance Hook
app.post('/api/maintenance', authenticateToken, async (req, res) => {
    const { engineer, date, area, system, component, spare_part_used, action, quantity, duration, work_status, remarks } = req.body;

    if (!engineer || !action) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const targetItemName = spare_part_used ? spare_part_used.split(' : (')[0] : null;
    console.log(`Log Debug: Action=${action}, SparePartString='${spare_part_used}', ParsedName='${targetItemName}'`);

    try {
        if (action === "Replaced" && targetItemName) {
            // Transaction for inventory update and log creation
            await prisma.$transaction(async (tx) => {
                const item = await tx.inventory.findUnique({
                    where: { product_name: targetItemName }
                });

                if (!item) {
                    console.error(`Spare part not found: '${targetItemName}'`);
                    throw new Error("Spare part not found in inventory: " + targetItemName);
                }

                const productId = item.id;
                let qtyUsed = quantity ? parseInt(quantity) : 0;
                if (qtyUsed <= 0) qtyUsed = 1;

                // Update inventory
                await tx.inventory.update({
                    where: { id: productId },
                    data: { qty: { decrement: qtyUsed } }
                });

                // Log movement 
                // Need to use tx for consistency, but helper uses global prisma. 
                // Inline duplicate logic for safety within transaction
                await tx.stockMovement.create({
                    data: {
                        product_id: productId,
                        movement_type: 'OUT',
                        quantity: qtyUsed,
                        reference_type: 'MAINTENANCE',
                        reference_id: null, // Log ID not known yet unless we create log first? 
                        // Actually create log is next.
                        performed_by: req.user.id,
                        notes: `Maintenance: ${action}`
                    }
                });

                // Create Log
                const newLog = await tx.log.create({
                    data: {
                        engineer,
                        date_of_work: date ? new Date(date) : null,
                        area,
                        system,
                        component,
                        spare_part_used,
                        action,
                        product_id: productId,
                        qty_used: qtyUsed,
                        duration: parseInt(duration),
                        work_status,
                        remarks
                    }
                });

                // Side effects (non-transactional for external services)
                saveToGoogleSheet({
                    engineer, date, area, system, component, spare_part_used, action, qty_used: qtyUsed, duration, work_status, remarks
                });

                logAudit(req.user.id, 'CREATE', 'logs', newLog.id, { engineer, action, component, qtyUsed }, req.ip);

                res.json({
                    message: "Maintenance Logged & Stock Updated",
                    updatedStock: item.qty - qtyUsed
                });
            });

        } else {
            // Just create Log
            const newLog = await prisma.log.create({
                data: {
                    engineer,
                    date_of_work: date ? new Date(date) : null,
                    area,
                    system,
                    component,
                    spare_part_used,
                    action,
                    product_id: null,
                    qty_used: 0,
                    duration: parseInt(duration),
                    work_status,
                    remarks
                }
            });

            saveToGoogleSheet({
                engineer, date, area, system, component, spare_part_used, action, qty_used: 0, duration, work_status, remarks
            });

            logAudit(req.user.id, 'CREATE', 'logs', newLog.id, { engineer, action, component }, req.ip);

            res.json({
                message: "Log Saved",
                updatedStock: null
            });
        }
    } catch (err) {
        if (err.message.includes("Spare part not found")) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

// ==================== ADMIN / UTILITY ENDPOINTS ====================

// Get Audit Log
app.get('/api/audit-log', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const rows = await prisma.auditLog.findMany({
            include: { user: { select: { username: true } } },
            orderBy: { timestamp: 'desc' },
            take: 100
        });

        // Flatten user.username
        const data = rows.map(r => ({
            ...r,
            username: r.user?.username
        }));

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User Sessions
app.get('/api/user-sessions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const rows = await prisma.userSession.findMany({
            include: { user: { select: { username: true } } },
            orderBy: { login_time: 'desc' },
            take: 50
        });

        const data = rows.map(r => ({
            ...r,
            username: r.user?.username
        }));

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Backup endpoints (Assuming backupService uses FS/CLI)
app.post('/api/backup/create', authenticateToken, requireAdmin, (req, res) => {
    const backup = createBackup();
    if (backup) {
        res.json({ message: "Backup created", file: backup });
    } else {
        res.status(500).json({ error: "Backup failed" });
    }
});

app.get('/api/backup/list', authenticateToken, requireAdmin, (req, res) => {
    const backups = listBackups();
    res.json({ data: backups });
});

app.post('/api/backup/restore', authenticateToken, requireAdmin, (req, res) => {
    const { filename } = req.body;
    const success = restoreBackup(filename);
    if (success) {
        res.json({ message: "Database restored" });
    } else {
        res.status(500).json({ error: "Restore failed" });
    }
});

// ==================== ANALYTICS ENDPOINTS ====================

// Most Used Spare Parts
app.get('/api/analytics/spare-parts-usage', authenticateToken, async (req, res) => {
    const { limit = 10, days = 30 } = req.query;

    try {
        const rows = await prisma.$queryRaw`
            SELECT 
                l.spare_part_used,
                l.product_id,
                inv.product_name,
                SUM(l.qty_used) as total_used,
                COUNT(*) as usage_count,
                inv.qty as current_stock,
                inv.min_qty
            FROM logs l
            LEFT JOIN inventory inv ON l.product_id = inv.id
            WHERE l.spare_part_used IS NOT NULL 
              AND l.spare_part_used != ''
              AND date(COALESCE(l.date_of_work, l.timestamp)) >= date('now', '-' || ${days} || ' days')
            GROUP BY l.product_id, l.spare_part_used
            ORDER BY total_used DESC
            LIMIT ${limit}
        `;
        // Note: Prisma raw query returns BigInt for COUNT/SUM sometimes. 
        // Express cannot serialize BigInt. Need to convert.
        const serialized = JSON.parse(JSON.stringify(rows, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.json({ data: serialized });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Maintenance Frequency by Area/System/Component
app.get('/api/analytics/maintenance-frequency', authenticateToken, async (req, res) => {
    const { groupBy = 'area', startDate, endDate, days = 30, filterKey, filterValue } = req.query;

    let groupColumn = 'area';
    let isAll = false;

    if (groupBy === 'system') groupColumn = 'system';
    else if (groupBy === 'component') groupColumn = 'component';
    else if (groupBy === 'action') groupColumn = 'action';
    else if (groupBy === 'all') isAll = true;

    try {
        // Robust Date Logic
        const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";
        let dateFilter = "";

        if (startDate && endDate) {
            const startValid = !isNaN(new Date(startDate).getTime());
            const endValid = !isNaN(new Date(endDate).getTime());

            if (startValid && endValid) {
                dateFilter = `${dateCol} >= date('${startDate}') AND ${dateCol} <= date('${endDate}')`;
            } else {
                dateFilter = `${dateCol} >= date('now', '-' || ${parseInt(days)} || ' days')`;
            }
        } else {
            dateFilter = `${dateCol} >= date('now', '-' || ${parseInt(days)} || ' days')`;
        }

        // Add optional Drill-Down Filter
        let drillDownClause = "";
        if (filterKey && filterValue) {
            // whitelist filter keys to prevent injection
            const validFilters = ['area', 'system', 'component', 'action', 'engineer'];
            if (validFilters.includes(filterKey)) {
                drillDownClause = `AND ${filterKey} = '${filterValue.replace(/'/g, "''")}'`; // Basic sanitation
            }
        }

        let query = '';
        if (isAll) {
            query = `
                SELECT 
                    'All' as category,
                    COUNT(*) as maintenance_count,
                    COUNT(DISTINCT engineer) as unique_engineers,
                    SUM(CASE WHEN action = 'Replaced' THEN 1 ELSE 0 END) as replacements,
                    SUM(CASE WHEN action = 'Fixed' THEN 1 ELSE 0 END) as fixes,
                    SUM(CASE WHEN action = 'Inspected' THEN 1 ELSE 0 END) as inspections
                FROM logs
                WHERE ${dateFilter}
                ${drillDownClause}
            `;
        } else {
            query = `
                SELECT 
                    ${groupColumn} as category,
                    COUNT(*) as maintenance_count,
                    COUNT(DISTINCT engineer) as unique_engineers,
                    SUM(CASE WHEN action = 'Replaced' THEN 1 ELSE 0 END) as replacements,
                    SUM(CASE WHEN action = 'Fixed' THEN 1 ELSE 0 END) as fixes,
                    SUM(CASE WHEN action = 'Inspected' THEN 1 ELSE 0 END) as inspections
                FROM logs
                WHERE ${groupColumn} IS NOT NULL 
                AND ${groupColumn} != ''
                AND ${dateFilter}
                ${drillDownClause}
                GROUP BY ${groupColumn}
                ORDER BY maintenance_count DESC
            `;
        }

        const rows = await prisma.$queryRawUnsafe(query);
        const serialized = JSON.parse(JSON.stringify(rows, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        res.json({ data: serialized, groupBy: groupColumn });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Efficiency Metrics (MTTR)
// Efficiency Metrics (MTTR)
app.get('/api/analytics/efficiency', authenticateToken, async (req, res) => {
    const { startDate, endDate, days = 30 } = req.query;

    try {
        // Date filtering logic (Reused)
        // Robust Date Logic
        const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";
        let dateFilter = "";

        if (startDate && endDate) {
            const startValid = !isNaN(new Date(startDate).getTime());
            const endValid = !isNaN(new Date(endDate).getTime());

            if (startValid && endValid) {
                dateFilter = `${dateCol} >= date('${startDate}') AND ${dateCol} <= date('${endDate}')`;
            } else {
                dateFilter = `${dateCol} >= date('now', '-' || ${parseInt(days)} || ' days')`;
            }
        } else {
            dateFilter = `${dateCol} >= date('now', '-' || ${parseInt(days)} || ' days')`;
        }

        // 1. Overall Stats (MTTR and Total Time)
        // Note: duration is in minutes
        const overallStats = await prisma.$queryRawUnsafe(`
            SELECT 
                AVG(duration) as avg_duration_minutes,
                SUM(duration) as total_duration_minutes,
                COUNT(*) as total_tasks
            FROM logs
            WHERE duration IS NOT NULL 
              AND duration > 0
              AND ${dateFilter}
        `);

        // 2. Average Duration by System
        const systemStats = await prisma.$queryRawUnsafe(`
            SELECT 
                system,
                AVG(duration) as avg_duration_minutes,
                COUNT(*) as task_count
            FROM logs
            WHERE system IS NOT NULL 
              AND system != ''
              AND duration IS NOT NULL
              AND duration > 0
              AND ${dateFilter}
            GROUP BY system
            ORDER BY avg_duration_minutes DESC
        `);

        // Serialize BigInts
        const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        console.log("DEBUG EFFICIENCY RESULT:", serialize(overallStats[0] || {}));

        res.json({
            overall: serialize(overallStats[0] || {}),
            bySystem: serialize(systemStats)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Predictive Analytics (MTBF)
app.get('/api/analytics/predictive', authenticateToken, async (req, res) => {
    try {
        // Robust Date Logic
        const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";

        // Fetch all failure-related logs (Replaced implies failure/wear)
        const rows = await prisma.$queryRawUnsafe(`
            SELECT 
                system,
                ${dateCol} as event_date,
                action
            FROM logs
            WHERE system IS NOT NULL 
              AND system != ''
              AND action IN ('Replaced', 'Fixed', 'Repair')
            ORDER BY system, ${dateCol} ASC
        `);

        // Serialize BigInts just in case (though we selected specific columns)
        const data = JSON.parse(JSON.stringify(rows, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        // Group by system
        const systemEvents = {};
        data.forEach(row => {
            if (!row.event_date) return;
            if (!systemEvents[row.system]) systemEvents[row.system] = [];
            systemEvents[row.system].push(new Date(row.event_date));
        });

        const predictions = [];

        for (const [system, dates] of Object.entries(systemEvents)) {
            // Ensure there's at least one event to process
            if (dates.length === 0) continue;

            // Calculate intervals
            let totalDays = 0;
            let intervals = 0;
            let mtbf = 0;
            const lastFailure = dates[dates.length - 1];

            if (dates.length >= 2) {
                for (let i = 1; i < dates.length; i++) {
                    const diffTime = Math.abs(dates[i] - dates[i - 1]);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    totalDays += diffDays;
                    intervals++;
                }
                if (intervals > 0) {
                    mtbf = Math.round(totalDays / intervals);
                }
            } else {
                // Fallback for single event: Assume a default MTBF or just show last date
                mtbf = 30; // meaningful default or 0? Let's use 30 as a placeholder or 0.
                // Actually, seeing '0 Days' MTBF is better than nothing, or handle in frontend.
            }

            // Predicted date
            const nextFailure = new Date(lastFailure);
            nextFailure.setDate(nextFailure.getDate() + (mtbf || 30)); // Default to 30 days if no history

            // Days until due
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            nextFailure.setHours(0, 0, 0, 0);

            const diffTime = nextFailure - today;
            const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status = 'Good';
            if (daysUntil < 0) status = 'Critical';
            else if (daysUntil <= 7) status = 'Risk';

            predictions.push({
                system,
                mtbf_days: mtbf > 0 ? mtbf : null, // Send null if not calculated
                last_failure: lastFailure,
                predicted_date: nextFailure,
                days_until_due: daysUntil,
                status
            });
        }

        // Sort by urgency (Critical first)
        predictions.sort((a, b) => a.days_until_due - b.days_until_due);

        res.json({ data: predictions });

    } catch (err) {
        console.error("Predictive Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Enhanced Low Stock Dashboard
app.get('/api/analytics/low-stock-dashboard', authenticateToken, async (req, res) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT 
                inv.id,
                inv.product_name,
                inv.qty,
                inv.min_qty,
                inv.reorder_point,
                inv.reorder_qty,
                inv.location_area,
                inv.location,
                inv.supplier_name,
                inv.unit_cost,
                inv.last_ordered_date,
                COALESCE(SUM(l.qty_used), 0) as used_last_30_days,
                COUNT(l.id) as usage_frequency
            FROM inventory inv
            LEFT JOIN logs l ON inv.id = l.product_id 
                AND l.date_of_work >= date('now', '-30 days')
            WHERE inv.qty <= inv.reorder_point
            GROUP BY inv.id
            ORDER BY (inv.qty - inv.min_qty) ASC
        `;

        const serialized = JSON.parse(JSON.stringify(rows, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        // Calculate urgency and recommendations
        const enrichedData = serialized.map(item => {
            // ... logic same ...
            // Need to ensure types. used_last_30_days might be string due to BigInt conversion
            const usedLast30 = Number(item.used_last_30_days);

            const stockPercentage = (item.qty / item.reorder_point) * 100;
            const daysToStockout = usedLast30 > 0
                ? Math.floor((item.qty / usedLast30) * 30)
                : 999;

            let urgency = 'low';
            if (item.qty <= item.min_qty) urgency = 'critical';
            else if (stockPercentage < 50) urgency = 'high';
            else if (stockPercentage < 75) urgency = 'medium';

            return {
                ...item,
                stockPercentage: Math.round(stockPercentage),
                daysToStockout,
                urgency,
                recommendedOrderQty: item.reorder_qty || 20
            };
        });

        res.json({ data: enrichedData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Inventory Overview Stats
app.get('/api/analytics/inventory-overview', authenticateToken, async (req, res) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_items,
                SUM(qty * unit_cost) as total_value,
                SUM(CASE WHEN qty <= min_qty THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN qty = 0 THEN 1 ELSE 0 END) as out_of_stock_count
            FROM inventory
        `;

        // rows is array, we want first
        const row = rows[0];

        const serialized = JSON.parse(JSON.stringify(row, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.json({ data: serialized });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Inventory Distribution by Location Area
app.get('/api/analytics/inventory-distribution', authenticateToken, async (req, res) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT 
                location_area, 
                COUNT(*) as item_count 
            FROM inventory 
            WHERE location_area IS NOT NULL AND location_area != ''
            GROUP BY location_area
            ORDER BY item_count DESC
        `;
        const serialized = JSON.parse(JSON.stringify(rows, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        res.json({ data: serialized });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create New User (Admin Only) (Duplicate? ALREADY DEFINED ABOVE lines 103)
// Wait, in previous view call, I saw duplicated /api/users definitions near bottom (lines 804 in viewed chunk).
// I should REMOVE duplicates if they exist, but replace_file_content replaces range.
// The code I am replacing (lines 540-1030) contains duplicated User endpoints in the original view?
// Let's look at lines 804-840 in previous view. Yes, duplications!
// I will NOT include them in my replacement content, effectively deleting them.
// I also see /api/email/test and QR endpoints. I need to keep those or refactor.

// ... resuming replacement content after Analytics ...

// Email test endpoint
app.post('/api/email/test', authenticateToken, requireAdmin, async (req, res) => {
    const { testEmailConfig } = await import('./emailService.js');
    const { email } = req.body;
    const result = await testEmailConfig(email);
    res.json(result);
});

// ==================== QR CODE ENDPOINTS ====================

// Generate QR code for inventory item
app.get('/api/inventory/:id/qrcode', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const item = await prisma.inventory.findUnique({
            where: { id: parseInt(id) }
        });

        if (!item) return res.status(404).json({ error: "Item not found" });

        // Create QR data
        const qrData = JSON.stringify({
            type: 'inventory',
            id: item.id,
            product_name: item.product_name,
            nav_number: item.nav_number,
            qty: item.qty,
            min_qty: item.min_qty,
            location: item.location,
            sub_location: item.sub_location,
            location_area: item.location_area
        });

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });

        res.json({ qrCode: qrCodeDataUrl, data: qrData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Decode QR and get item data
app.post('/api/qr/decode', authenticateToken, async (req, res) => {
    const { qrData } = req.body;

    try {
        const data = JSON.parse(qrData);

        if (data.type === 'inventory' && data.id) {
            const item = await prisma.inventory.findUnique({
                where: { id: parseInt(data.id) }
            });

            if (!item) return res.status(404).json({ error: "Item not found" });
            res.json({ item, qrData: data });

        } else {
            res.status(400).json({ error: "Invalid QR code data" });
        }
    } catch (error) {
        res.status(400).json({ error: "Invalid QR code format" });
    }
});

// ==================== SCHEDULER ====================

// ==================== INVENTORY ANALYTICS ====================

// 1. Inventory Summary (Value, Counts)
app.get('/api/analytics/inventory-summary', authenticateToken, async (req, res) => {
    try {
        const summary = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_items,
                SUM(qty * unit_cost) as total_value, 
                SUM(CASE WHEN qty <= min_qty THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN qty = 0 THEN 1 ELSE 0 END) as out_of_stock_count
            FROM inventory
        `;

        const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.json({ data: serialize(summary[0]) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Low Stock Dashboard
app.get('/api/analytics/low-stock-dashboard', authenticateToken, async (req, res) => {
    try {
        const lowStockItems = await prisma.$queryRaw`
            SELECT * FROM inventory 
            WHERE qty <= min_qty
            ORDER BY qty ASC
        `;
        res.json({ data: lowStockItems });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Spare Parts Usage Trends
app.get('/api/analytics/spare-parts-usage', authenticateToken, async (req, res) => {
    const { days = 30, limit = 10 } = req.query;
    try {
        const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";

        const usage = await prisma.$queryRawUnsafe(`
            SELECT 
                spare_part_used as product_name,
                COUNT(*) as usage_count,
                SUM(qty_used) as total_used
            FROM logs
            WHERE spare_part_used IS NOT NULL 
              AND spare_part_used != ''
              AND ${dateCol} >= date('now', '-' || ${parseInt(days)} || ' days')
            GROUP BY spare_part_used
            ORDER BY total_used DESC
            LIMIT ${parseInt(limit)}
        `);

        const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.json({ data: serialize(usage) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DEBUG DIAGNOSE ENDPOINT
app.get('/api/debug/diagnose', async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const totalLogs = await prisma.log.count();
        const logsWithDuration = await prisma.log.count({
            where: { duration: { gt: 0 } }
        });

        // Robust Date Logic (Copy from analytics)
        const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";

        const logsInWindow = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count 
            FROM logs 
            WHERE ${dateCol} >= date('now', '-30 days')
        `);

        const efficiencyStats = await prisma.$queryRawUnsafe(`
            SELECT 
                AVG(duration) as avg,
                SUM(duration) as sum,
                COUNT(*) as count
            FROM logs
            WHERE duration IS NOT NULL 
              AND duration > 0
              AND ${dateCol} >= date('now', '-30 days')
        `);

        const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.json({
            serverTime: now.toString(),
            totalLogs,
            logsWithDuration,
            logsInLast30Days: serialize(logsInWindow),
            efficiencyQueryBoxed: serialize(efficiencyStats)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
import { sendLowStockAlert } from './emailService.js';

// Run every 24 hours (86400000 ms) or shorter for testing
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

const checkLowStockAndNotify = async () => {
    console.log('⏰ Running daily stock check...');

    try {
        const items = await prisma.$queryRaw`
            SELECT * FROM inventory 
            WHERE qty <= min_qty 
            AND (last_ordered_date IS NULL OR last_ordered_date < date('now', '-7 days'))
        `;

        if (items && items.length > 0) {
            console.log(`⚠️ Found ${items.length} low stock items. Sending alert...`);
            const result = await sendLowStockAlert(items);
            if (result.success) {
                console.log(`✅ Alert sent to admin.`);
            }
        } else {
            console.log('✅ Stock levels healthy.');
        }
    } catch (err) {
        console.error('❌ Scheduler DB Error:', err.message);
    }
};

// Start Scheduler
setTimeout(checkLowStockAndNotify, 60000);
setInterval(checkLowStockAndNotify, CHECK_INTERVAL);


// Delete User (Admin Only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id);

    // Prevent self-deletion
    if (req.user.id === userId) {
        return res.status(400).json({ error: "You cannot delete your own account." });
    }

    try {
        const user = await prisma.user.delete({
            where: { id: userId }
        });

        logAudit(req.user.id, 'DELETE_USER', 'users', userId, { username: user.username }, req.ip);
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: "User not found" });
        }
        console.error("Delete user error:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// ==================== STATIC FILE SERVING (DEPLOYMENT) ====================
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../client/dist')));

// The "catchall" handler: for any request that doesn't
// match the ones above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔐 JWT authentication enabled`);
    console.log(`📦 Automated backup enabled`);
    console.log(`🤖 Auto-reorder scheduler active (Daily Check)`);
});

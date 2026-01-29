import cron from 'node-cron';
import prisma from './lib/prisma.js';

/**
 * Check for items that need reordering
 */
export const checkLowStock = async () => {
    // Using simple raw query for column comparison (qty <= reorder_point)
    // Prisma doesn't natively support comparing two columns in 'where' clause easily yet
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM inventory 
            WHERE qty <= reorder_point AND (product_name IS NOT NULL AND product_name != '')
        `;
        return rows;
    } catch (err) {
        console.error("Error checking low stock:", err);
        throw err;
    }
};

/**
 * Generate Purchase Order number
 */
const generatePONumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
};

/**
 * Check low stock and send email alert (does NOT auto-create POs)
 */
export const checkAndAlertLowStock = async (adminEmail) => {
    try {
        const lowStockItems = await checkLowStock();

        if (lowStockItems.length === 0) {
            console.log('✅ No items need reordering');
            return { message: 'No items need reordering', items: [] };
        }

        console.log(`📦 Found ${lowStockItems.length} items needing reorder`);

        // Import email service dynamically to avoid circular dependencies
        const { sendLowStockAlert } = await import('./emailService.js');

        // Send email notification
        const emailResult = await sendLowStockAlert(lowStockItems, adminEmail);

        if (emailResult.success) {
            console.log('📧 Low stock alert email sent successfully');
        } else {
            console.log('⚠️  Email notification failed:', emailResult.message);
        }

        return {
            message: `Found ${lowStockItems.length} low stock items. ${emailResult.success ? 'Email alert sent.' : 'Email failed - check configuration.'}`,
            items: lowStockItems,
            emailSent: emailResult.success
        };
    } catch (error) {
        console.error('❌ Low stock check failed:', error);
        throw error;
    }
};

/**
 * Auto-generate purchase orders for low stock items (requires manual trigger)
 */
export const autoGeneratePurchaseOrders = async (adminEmail) => {
    try {
        const lowStockItems = await checkLowStock();

        if (lowStockItems.length === 0) {
            console.log('✅ No items need reordering');
            return { message: 'No items need reordering', items: [] };
        }

        console.log(`📦 Generating POs for ${lowStockItems.length} items`);

        // Group items by supplier
        const itemsBySupplier = {};
        lowStockItems.forEach(item => {
            const supplier = item.supplier_name || 'Unknown Supplier';
            if (!itemsBySupplier[supplier]) {
                itemsBySupplier[supplier] = [];
            }
            itemsBySupplier[supplier].push(item);
        });

        const createdPOs = [];

        // Create PO for each supplier
        for (const [supplier, items] of Object.entries(itemsBySupplier)) {
            const poNumber = generatePONumber();
            const totalCost = items.reduce((sum, item) => {
                const cost = (item.unit_cost || 0) * (item.reorder_qty || 20);
                return sum + cost;
            }, 0);

            const supplierEmail = items[0].supplier_email || '';

            // Insert PO and Items using transaction
            const po = await prisma.purchaseOrder.create({
                data: {
                    po_number: poNumber,
                    supplier_name: supplier,
                    status: 'Draft',
                    total_cost: totalCost,
                    notes: `Generated for ${items.length} low stock items`,
                    items: {
                        create: items.map(item => ({
                            product_id: item.id,
                            quantity: item.reorder_qty || 20,
                            unit_cost: item.unit_cost || 0
                        }))
                    }
                },
                include: { items: true } // Include items in result if needed
            });

            // Map to expected format for email
            createdPOs.push({
                poNumber,
                supplier,
                supplierEmail,
                itemCount: items.length,
                totalCost,
                items: items.map(i => ({
                    product_name: i.product_name,
                    quantity: i.reorder_qty || 20,
                    unit_cost: i.unit_cost || 0
                }))
            });
        }

        // Send email confirmations for created POs
        try {
            const { sendPOConfirmation } = await import('./emailService.js');
            for (const po of createdPOs) {
                await sendPOConfirmation(po, adminEmail);
            }
        } catch (emailError) {
            console.log('⚠️  PO confirmation emails not sent:', emailError.message);
        }

        console.log(`✅ Generated ${createdPOs.length} purchase orders`);
        return { message: 'Purchase orders generated', pos: createdPOs };
    } catch (error) {
        console.error('❌ PO generation failed:', error);
        throw error;
    }
};

/**
 * Log stock movement
 */
export const logStockMovement = async (productId, movementType, quantity, referenceType, referenceId, performedBy, notes = null) => {
    try {
        const movement = await prisma.stockMovement.create({
            data: {
                product_id: productId,
                movement_type: movementType,
                quantity: quantity,
                reference_type: referenceType,
                reference_id: referenceId,
                performed_by: performedBy,
                notes: notes
            }
        });
        return movement.id;
    } catch (err) {
        console.error("Error logging stock movement:", err);
        throw err;
    }
};

/**
 * Start automated low stock alert scheduler (sends emails only, no auto-PO creation)
 */
export const startReorderScheduler = () => {
    const adminEmail = process.env.ADMIN_EMAIL;

    // Run every day at 8 AM - sends email alerts only
    cron.schedule('0 8 * * *', async () => {
        console.log('🕐 Running scheduled low stock check...');
        try {
            const result = await checkAndAlertLowStock(adminEmail);
            console.log('📧 Low stock check complete:', result.message);
        } catch (error) {
            console.error('❌ Scheduled low stock check failed:', error);
        }
    });

    console.log('🤖 Low stock alert scheduler started (daily at 8 AM)');
    console.log('📧 Email alerts will be sent to:', adminEmail || 'EMAIL_USER from .env');
    console.log('ℹ️  Purchase orders require manual approval from UI');
};

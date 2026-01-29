import nodemailer from 'nodemailer';
import { config } from './config.js';

// Email configuration
const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // Your Outlook email
        pass: process.env.EMAIL_PASS  // Your Outlook password or app password
    }
};

/**
 * Create email transporter
 */
const createTransporter = () => {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASS in .env');
        return null;
    }

    return nodemailer.createTransport(emailConfig);
};

/**
 * Send low stock alert email
 */
export const sendLowStockAlert = async (lowStockItems, adminEmail) => {
    const transporter = createTransporter();

    if (!transporter) {
        console.log('📧 Email notifications disabled - no credentials configured');
        return { success: false, message: 'Email not configured' };
    }

    try {
        // Build email content
        const itemsList = lowStockItems.map(item =>
            `• ${item.product_name} - Current: ${item.qty}, Reorder Point: ${item.reorder_point}, Supplier: ${item.supplier_name || 'N/A'}`
        ).join('\n');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">MPM Inventory Alert</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e0e0e0;">
                    <h2 style="color: #dc3545; margin-top: 0;">⚠️ Low Stock Alert</h2>
                    <p style="font-size: 16px; color: #333;">
                        <strong>${lowStockItems.length} item(s)</strong> are currently below their reorder point and need attention.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Items Requiring Reorder:</h3>
                        <pre style="font-family: 'Courier New', monospace; font-size: 14px; color: #555; white-space: pre-wrap;">${itemsList}</pre>
                    </div>

                    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <strong>📋 Action Required:</strong><br>
                        Please review the low stock items and approve purchase orders from the MPM system.
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Open MPM System
                        </a>
                    </div>
                </div>
                
                <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    <p style="margin: 5px 0;">This is an automated notification from MPM Inventory Management System</p>
                    <p style="margin: 5px 0;">Sent on ${new Date().toLocaleString()}</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"MPM Inventory System" <${emailConfig.auth.user}>`,
            to: adminEmail || emailConfig.auth.user,
            subject: `🚨 Low Stock Alert - ${lowStockItems.length} Items Need Reordering`,
            text: `Low Stock Alert\n\n${lowStockItems.length} items are below their reorder point:\n\n${itemsList}\n\nPlease login to MPM system to review and approve purchase orders.`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Low stock alert email sent:', info.messageId);

        return {
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId
        };
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        return {
            success: false,
            message: error.message
        };
    }
};

/**
 * Send purchase order confirmation email
 */
export const sendPOConfirmation = async (poDetails, adminEmail) => {
    const transporter = createTransporter();

    if (!transporter) {
        return { success: false, message: 'Email not configured' };
    }

    try {
        const itemsList = poDetails.items.map(item =>
            `• ${item.product_name} - Qty: ${item.quantity} @ $${item.unit_cost} = $${(item.quantity * item.unit_cost).toFixed(2)}`
        ).join('\n');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Purchase Order Created</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e0e0e0;">
                    <h2 style="color: #28a745; margin-top: 0;">✅ PO ${poDetails.poNumber} Generated</h2>
                    
                    <div style="background: white; padding: 20px; margin: 20px 0; border: 1px solid #dee2e6;">
                        <p style="margin: 5px 0;"><strong>Supplier:</strong> ${poDetails.supplier}</p>
                        <p style="margin: 5px 0;"><strong>Total Cost:</strong> $${poDetails.totalCost.toFixed(2)}</p>
                        <p style="margin: 5px 0;"><strong>Items:</strong> ${poDetails.items.length}</p>
                    </div>

                    <div style="background: white; padding: 20px; border-left: 4px solid #28a745;">
                        <h3 style="margin-top: 0;">Order Details:</h3>
                        <pre style="font-family: 'Courier New', monospace; font-size: 14px; color: #555; white-space: pre-wrap;">${itemsList}</pre>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173" 
                           style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            View in MPM System
                        </a>
                    </div>
                </div>
                
                <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    <p style="margin: 5px 0;">This is an automated notification from MPM Inventory Management System</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"MPM Inventory System" <${emailConfig.auth.user}>`,
            to: adminEmail || emailConfig.auth.user,
            subject: `📦 Purchase Order ${poDetails.poNumber} Created - ${poDetails.supplier}`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ PO confirmation email sent:', info.messageId);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send PO email:', error.message);
        return { success: false, message: error.message };
    }
};

/**
 * Test email configuration
 */
export const testEmailConfig = async (testEmail) => {
    const transporter = createTransporter();

    if (!transporter) {
        return { success: false, message: 'Email not configured' };
    }

    try {
        const mailOptions = {
            from: `"MPM Inventory System" <${emailConfig.auth.user}>`,
            to: testEmail || emailConfig.auth.user,
            subject: '✅ MPM Email Test - Configuration Successful',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px;">
                    <h2 style="color: #28a745;">✅ Email Configuration Test</h2>
                    <p>Your MPM Inventory System email notifications are configured correctly!</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Test email failed:', error.message);
        return { success: false, message: error.message };
    }
};

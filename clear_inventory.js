
import prisma from './src/lib/prisma.js';

const clearInventory = async () => {
    console.log('🗑️  Clearing Inventory Data...');

    try {
        const result = await prisma.inventory.deleteMany({});
        console.log(`✅ Successfully deleted ${result.count} items from inventory.`);
        console.log('✨ The inventory list is now empty and ready for new data.');
    } catch (error) {
        console.error('❌ Error clearing inventory:', error);
    } finally {
        await prisma.$disconnect();
    }
};

clearInventory();

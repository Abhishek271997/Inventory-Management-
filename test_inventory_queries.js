

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- 1. Testing Raw Inventory Count ---");
        const count = await prisma.inventory.count();
        console.log("Total Inventory Items (Prisma):", count);

        console.log("\n--- 2. Testing Summary Query ---");
        const summary = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_items,
                SUM(qty * unit_cost) as total_value, 
                SUM(CASE WHEN qty <= min_qty THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN qty = 0 THEN 1 ELSE 0 END) as out_of_stock_count
            FROM inventory
        `;
        console.log("Raw Summary Result:", summary);

        console.log("\n--- 3. Testing Serializer ---");
        const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        console.log("Serialized Summary:", serialize(summary[0]));

        console.log("\n--- 4. Testing Low Stock Query ---");
        const lowStock = await prisma.$queryRaw`
            SELECT * FROM inventory 
            WHERE qty <= min_qty
            ORDER BY qty ASC 
        `;
        console.log("Low Stock Items Found:", lowStock.length);
        if (lowStock.length > 0) console.log("Sample Item:", lowStock[0]);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();


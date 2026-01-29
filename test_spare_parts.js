
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- Checking Logs for Spare Parts ---");
        const logs = await prisma.log.findMany({
            take: 10,
            orderBy: { timestamp: 'desc' },
            select: {
                id: true,
                action: true,
                spare_part_used: true,
                qty_used: true
            }
        });
        console.log("Recent Logs:", JSON.stringify(logs, null, 2));

        console.log("\n--- Testing Usage Query ---");
        const usage = await prisma.$queryRawUnsafe(`
            SELECT 
                spare_part_used as product_name,
                COUNT(*) as usage_count,
                SUM(qty_used) as total_used
            FROM logs
            WHERE spare_part_used IS NOT NULL 
              AND spare_part_used != ''
              AND date(date_of_work) >= date('now', '-30 days')
            GROUP BY spare_part_used
            ORDER BY total_used DESC
        `);
        console.log("Usage Query Result:", usage);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();

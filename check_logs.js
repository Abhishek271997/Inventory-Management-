import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLogs() {
    try {
        const logs = await prisma.log.findMany();
        console.log('Total Logs:', logs.length);
        console.log(JSON.stringify(logs, null, 2));

        // Also try running the raw query that the analytics endpoint uses
        const days = 30;
        const groupColumn = 'area';
        const query = `
            SELECT 
                ${groupColumn} as category,
                COUNT(*) as maintenance_count
            FROM logs
            WHERE ${groupColumn} IS NOT NULL 
              AND ${groupColumn} != ''
              AND date_of_work >= date('now', '-' || ${days} || ' days')
            GROUP BY ${groupColumn}
        `;
        const analytics = await prisma.$queryRawUnsafe(query);
        console.log('Analytics Query Result:', analytics);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkLogs();

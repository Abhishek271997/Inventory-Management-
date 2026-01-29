
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Logs for Metrics ---');
    const logs = await prisma.log.findMany({
        select: {
            id: true,
            date_of_work: true,
            timestamp: true,
            duration: true,
            action: true,
            system: true
        }
    });

    console.log(`Total Logs: ${logs.length}`);
    logs.forEach(log => {
        console.log(JSON.stringify(log));
    });

    console.log('\n--- Testing Efficiency Endpoint Logic ---');
    // Default 300 days to catch everything
    const days = 300;
    const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";

    try {
        const efficiency = await prisma.$queryRawUnsafe(`
            SELECT 
                AVG(duration) as avg_duration_minutes,
                COUNT(*) as total_tasks
            FROM logs
            WHERE duration IS NOT NULL 
              AND duration > 0
              AND ${dateCol} >= date('now', '-' || ${days} || ' days')
        `);
        console.log("Efficiency Logic Result:", efficiency);
    } catch (e) { console.error(e); }

    console.log('\n--- Testing Predictive Logic ---');
    try {
        const predictive = await prisma.$queryRawUnsafe(`
            SELECT 
                system,
                ${dateCol} as event_date,
                action
            FROM logs
            WHERE system IS NOT NULL 
              AND action IN ('Replaced', 'Fixed', 'Repair')
            ORDER BY system, ${dateCol} ASC
        `);
        console.log("Predictive Rows:", predictive);
    } catch (e) { console.error(e); }

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

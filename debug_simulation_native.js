
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Simulating Efficiency Query (Native) ---');

    // Native date Calc
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    const days = 30;

    // Robust Date Logic
    const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";
    // Check exact filter logic from index.js
    let dateFilter = "";
    // Logic from server:
    // dateFilter = `${dateCol} >= date('${startDate}') AND ${dateCol} <= date('${endDate}')`;
    // OR 
    // dateFilter = `${dateCol} >= date('now', '-' || ${parseInt(days)} || ' days')`;

    // Let's test BOTH conditions

    console.log("1. Testing date('now'...) filter:");
    try {
        const res = await prisma.$queryRawUnsafe(`
            SELECT 
                AVG(duration) as avg_duration_minutes,
                SUM(duration) as total_duration_minutes,
                COUNT(*) as total_tasks
            FROM logs
            WHERE duration IS NOT NULL 
              AND duration > 0
              AND ${dateCol} >= date('now', '-' || ${days} || ' days')
        `);
        console.log("Result (date('now')):", res);
    } catch (e) {
        console.error("Error 1:", e.message);
    }

    console.log("\n2. Testing explicit date range filter:");
    try {
        const res2 = await prisma.$queryRawUnsafe(`
            SELECT 
                AVG(duration) as avg_duration_minutes,
                SUM(duration) as total_duration_minutes,
                COUNT(*) as total_tasks
            FROM logs
            WHERE duration IS NOT NULL 
              AND duration > 0
              AND ${dateCol} >= date('${startDate}') AND ${dateCol} <= date('${endDate}')
        `);
        console.log("Result (Explicit Range):", res2);
    } catch (e) {
        console.error("Error 2:", e.message);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

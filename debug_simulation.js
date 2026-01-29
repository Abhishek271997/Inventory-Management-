
import { PrismaClient } from '@prisma/client';
import { format, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    const startDate = format(subDays(today, 30), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    console.log(`--- Simulating Queries for Range: ${startDate} to ${endDate} ---`);

    // Robust Date Logic
    const dateCol = "COALESCE(date(date_of_work), date(timestamp), date(timestamp/1000, 'unixepoch'))";
    const dateFilter = `${dateCol} >= date('${startDate}') AND ${dateCol} <= date('${endDate}')`;

    // 1. Efficiency
    console.log("1. Efficiency Query:");
    const efficiency = await prisma.$queryRawUnsafe(`
        SELECT 
            AVG(duration) as avg_duration_minutes,
            COUNT(*) as total_tasks,
            ${dateCol} as debug_date
        FROM logs
        WHERE duration IS NOT NULL 
          AND duration > 0
          AND ${dateFilter}
    `);
    console.log(efficiency);

    // 2. Predictive (Check count per system)
    console.log("\n2. Predictive System Counts (Replaced/Fixed/Repair):");
    const predictive = await prisma.$queryRawUnsafe(`
        SELECT 
            system,
            COUNT(*) as failure_count
        FROM logs
        WHERE system IS NOT NULL 
            AND action IN ('Replaced', 'Fixed', 'Repair')
        GROUP BY system
    `);
    console.log(predictive);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

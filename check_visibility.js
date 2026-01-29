
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Log Dates vs 30 Days Ago ---');
    const logs = await prisma.log.findMany({
        select: { id: true, date_of_work: true, timestamp: true, duration: true }
    });

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    console.log(`Now: ${now.toISOString()}`);
    console.log(`30 Days Ago: ${thirtyDaysAgo.toISOString()}`);

    let visibleCount = 0;
    logs.forEach(log => {
        // Robust Date Logic simulation
        let logDate = null;
        if (log.date_of_work) logDate = new Date(log.date_of_work);
        else if (log.timestamp) {
            // Check if it's epoch or ISO
            const t = Number(log.timestamp);
            if (!isNaN(t) && t > 1000000000000) logDate = new Date(t); // ms
            else if (!isNaN(t)) logDate = new Date(t * 1000); // sec
            else logDate = new Date(log.timestamp); // string
        }

        const isVisible = logDate && logDate >= thirtyDaysAgo;
        if (isVisible) visibleCount++;

        console.log(`Log #${log.id}: Date=${logDate?.toISOString()}, Duration=${log.duration}, Visible=${isVisible}`);
    });

    console.log(`Total Visible Logs for Default View: ${visibleCount}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

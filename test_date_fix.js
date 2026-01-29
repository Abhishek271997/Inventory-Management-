
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Testing Robust Date Parsing ---');
    // Try to recover the dates that are currently NULL
    const result = await prisma.$queryRaw`
        SELECT 
            id,
            timestamp,
            date(timestamp) as standard_date,
            date(timestamp/1000, 'unixepoch') as epoch_date,
            COALESCE(date(timestamp), date(timestamp/1000, 'unixepoch')) as fixed_date
        FROM logs
    `;
    console.log(result);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

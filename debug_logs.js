
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Detailed Log Inspection ---');
    const logs = await prisma.log.findMany();

    logs.forEach(log => {
        console.log(`ID: ${log.id}`);
        console.log(`  DateOfWork (JS): ${log.date_of_work}`);
        console.log(`  Timestamp (JS):  ${log.timestamp}`);
        console.log(`  Raw DateOfWork Type: ${typeof log.date_of_work}`);
    });

    // Validating SQLite Date Function
    console.log('\n--- SQLite Date Function Test ---');
    const result = await prisma.$queryRaw`
        SELECT 
            id,
            date_of_work,
            timestamp,
            date(timestamp) as sqlite_date_timestamp,
            date(date_of_work) as sqlite_date_work,
            COALESCE(date_of_work, timestamp) as coalesced_raw,
            date(COALESCE(date_of_work, timestamp)) as coalesced_date
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

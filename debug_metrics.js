
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Log Durations ---');
    const logs = await prisma.log.findMany({
        select: {
            id: true,
            duration: true,
            engineer: true,
            system: true,
            status: true // or is it work_status?
        }
    });
    console.log(logs);

    console.log('\n--- Checking Predictive Endpoint Logic (Hypothetical) ---');
    // If we find MTBF logic, we can simulate it. 
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
    
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.inventory.count();
        console.log(`Inventory Items Count: ${count}`);
        const items = await prisma.inventory.findMany();
        console.log('Inventory Items:', JSON.stringify(items, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

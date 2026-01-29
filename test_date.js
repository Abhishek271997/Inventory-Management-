import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDate() {
    try {
        const raw = await prisma.$queryRawUnsafe("SELECT date('2026-01-21T12:10:00.000Z') as test_date");
        console.log('Date parse result:', raw);

        const check = await prisma.$queryRawUnsafe(`
        SELECT * FROM logs 
        WHERE date_of_work >= date('now', '-30 days')
    `);
        console.log('Simple Date Check:', check);

        // Try comparing usage of datetime() instead
        const checkTime = await prisma.$queryRawUnsafe(`
        SELECT * FROM logs 
        WHERE date_of_work >= datetime('now', '-30 days')
    `);
        console.log('Datetime Check:', checkTime);

        // Check fallback logic
        const fallback = await prisma.$queryRawUnsafe(`
        SELECT * FROM logs 
        WHERE COALESCE(date_of_work, timestamp) >= date('now', '-30 days')
    `);
        console.log('Fallback Check:', fallback);

        // Check using date() wrapper
        const dateWrapper = await prisma.$queryRawUnsafe(`
        SELECT * FROM logs 
        WHERE date(COALESCE(date_of_work, timestamp)) >= date('now', '-30 days')
    `);
        console.log('Date Wrapper Check:', dateWrapper);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testDate();

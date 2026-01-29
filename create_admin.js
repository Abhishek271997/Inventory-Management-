
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    try {
        const user = await prisma.user.upsert({
            where: { username: 'admin' },
            update: {
                hashed_password: hashedPassword,
                password: 'hashed_placeholder'
            },
            create: {
                username: 'admin',
                password: 'hashed_placeholder',
                hashed_password: hashedPassword,
                role: 'admin'
            },
        });
        console.log('Admin user created:', user);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

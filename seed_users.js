
import prisma from './src/lib/prisma.js';
import { hashPassword } from './src/authMiddleware.js';

const seedUsers = async () => {
    console.log('🌱 Seeding Users...');

    try {
        // 1. Admin User
        const adminPass = await hashPassword('admin123');
        const admin = await prisma.user.upsert({
            where: { username: 'admin' },
            update: {
                password: adminPass,
                hashed_password: adminPass, // Ensure both fields are set for safety
                role: 'admin',
                is_active: true
            },
            create: {
                username: 'admin',
                email: 'admin@example.com',
                password: adminPass,
                hashed_password: adminPass,
                role: 'admin',
                is_active: true
            }
        });
        console.log(`✅ Admin user ready: ${admin.username}`);

        // 2. Standard User
        const userPass = await hashPassword('user123');
        const user = await prisma.user.upsert({
            where: { username: 'user' },
            update: {
                password: userPass,
                hashed_password: userPass,
                role: 'user',
                is_active: true
            },
            create: {
                username: 'user',
                email: 'user@example.com',
                password: userPass,
                hashed_password: userPass,
                role: 'user',
                is_active: true
            }
        });
        console.log(`✅ Standard user ready: ${user.username}`);

    } catch (error) {
        console.error('❌ Error seeding users:', error);
    } finally {
        await prisma.$disconnect();
    }
};

seedUsers();

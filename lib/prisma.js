import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development due to hot reloading
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

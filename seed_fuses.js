import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const fuseData = [
    { product_name: "Fuse 40A 660V", qty: 4, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 32A 400V", qty: 25, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 30A 500V", qty: 2, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 16A 500V", qty: 6, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 13A (Plug Fuse)", qty: 10, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 10A 500V", qty: 12, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 8A 500V", qty: 7, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 6A 240V", qty: 4, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 4A 500V", qty: 13, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 3A (Plug Fuse)", qty: 0, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 2A 600V", qty: 2, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 },
    { product_name: "Fuse 2A 500V", qty: 13, location_area: "RC", location: "Blue Cupboard", sub_location: "Left Hand Door", min_qty: 1 }
];

async function main() {
    console.log(`Start seeding ${fuseData.length} fuses...`);

    for (const fuse of fuseData) {
        const item = await prisma.inventory.upsert({
            where: { product_name: fuse.product_name },
            update: fuse,
            create: fuse,
        });
        console.log(`Created/Updated: ${item.product_name}`);
    }

    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });

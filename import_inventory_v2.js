
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import prisma from './src/lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parseCSVLine = (line) => {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            currentValue += '"'; // Handle escaped quotes
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    values.push(currentValue.trim());
    return values;
};

const importInventory = async () => {
    const filePath = resolve(__dirname, 'inventory.csv');
    console.log(`📂 Reading file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error('❌ Error: inventory.csv not found!');
        return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length < 2) {
        console.error('❌ Error: CSV file is empty or missing data.');
        return;
    }

    // Header mapping based on inspected file:
    // Product Name ,Nav Number ,Quantity ,Area,Location,SUB-LOCATION,MIN QTY
    // We will blindly assume column order to be safe if headers vary slightly, 
    // OR try to map by index if headers are consistent. 
    // The user said "Product Name ,Nav Number..." so we can trust index 0..6.

    // 0: Product Name
    // 1: Nav Number
    // 2: Quantity
    // 3: Area
    // 4: Location
    // 5: Sub-Location
    // 6: Min Qty

    console.log(`📊 Found ${lines.length - 1} items to import.`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = parseCSVLine(line);

        if (cols.length < 3) continue; // Skip empty/malformed lines

        const productName = cols[0];
        const navNumber = cols[1];
        const qty = parseInt(cols[2]) || 0;
        const area = cols[3] || '';
        const location = cols[4] || '';
        const subLocation = cols[5] || '';
        const minQty = parseInt(cols[6]) || 0;

        try {
            await prisma.inventory.upsert({
                where: { product_name: productName },
                update: {
                    nav_number: navNumber,
                    qty: qty,
                    location_area: area,
                    location: location,
                    sub_location: subLocation,
                    min_qty: minQty || 5
                },
                create: {
                    product_name: productName,
                    nav_number: navNumber,
                    qty: qty,
                    location_area: area,
                    location: location,
                    sub_location: subLocation,
                    min_qty: minQty || 5
                }
            });
            successCount++;
            if (successCount % 50 === 0) process.stdout.write('.');
        } catch (err) {
            console.error(`\n❌ Error importing "${productName}": ${err.message}`);
            errorCount++;
        }
    }

    console.log(`\n\n✨ Import Completed! Successfully processed ${successCount} items.`);
    if (errorCount > 0) console.log(`⚠️ ${errorCount} items failed to import.`);

    await prisma.$disconnect();
};

importInventory();

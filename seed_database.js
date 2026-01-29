import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, 'prisma/inventory.db');

const db = new sqlite3.Database(dbPath);

// Sample spare parts and inventory items
const inventoryItems = [
    { product_name: 'AC Motor 3HP', qty: 8, min_qty: 5, reorder_point: 10, location_area: 'Warehouse A', location: 'Rack A-12', sub_location: 'Shelf 3' },
    { product_name: 'Bearing SKF 6205', qty: 25, min_qty: 15, reorder_point: 20, location_area: 'Warehouse A', location: 'Rack A-08', sub_location: 'Bin 2' },
    { product_name: 'Hydraulic Pump', qty: 3, min_qty: 4, reorder_point: 6, location_area: 'Warehouse B', location: 'Rack B-05', sub_location: 'Shelf 1' },
    { product_name: 'Proximity Sensor', qty: 45, min_qty: 20, reorder_point: 30, location_area: 'Warehouse A', location: 'Rack A-15', sub_location: 'Drawer 4' },
    { product_name: 'V-Belt A50', qty: 12, min_qty: 10, reorder_point: 15, location_area: 'Warehouse B', location: 'Rack B-03', sub_location: 'Hook 2' },
    { product_name: 'Servo Motor 1KW', qty: 2, min_qty: 3, reorder_point: 5, location_area: 'Warehouse A', location: 'Rack A-20', sub_location: 'Shelf 1' },
    { product_name: 'Limit Switch', qty: 60, min_qty: 30, reorder_point: 40, location_area: 'Warehouse B', location: 'Rack B-12', sub_location: 'Bin 5' },
    { product_name: 'Contactor 25A', qty: 18, min_qty: 10, reorder_point: 15, location_area: 'Warehouse A', location: 'Rack A-18', sub_location: 'Shelf 2' },
    { product_name: 'Pneumatic Cylinder', qty: 5, min_qty: 6, reorder_point: 8, location_area: 'Warehouse B', location: 'Rack B-07', sub_location: 'Shelf 4' },
    { product_name: 'PLC Input Module', qty: 7, min_qty: 5, reorder_point: 8, location_area: 'Warehouse A', location: 'Rack A-25', sub_location: 'Cabinet 1' },
    { product_name: 'Hydraulic Hose 1/2"', qty: 35, min_qty: 20, reorder_point: 25, location_area: 'Warehouse B', location: 'Rack B-15', sub_location: 'Roll Holder' },
    { product_name: 'Solenoid Valve', qty: 22, min_qty: 15, reorder_point: 18, location_area: 'Warehouse A', location: 'Rack A-10', sub_location: 'Shelf 3' },
    { product_name: 'Encoder 1024PPR', qty: 9, min_qty: 8, reorder_point: 12, location_area: 'Warehouse A', location: 'Rack A-22', sub_location: 'Drawer 2' },
    { product_name: 'Gearbox Reducer 20:1', qty: 4, min_qty: 3, reorder_point: 5, location_area: 'Warehouse B', location: 'Rack B-10', sub_location: 'Floor' },
    { product_name: 'Circuit Breaker 50A', qty: 14, min_qty: 10, reorder_point: 12, location_area: 'Warehouse A', location: 'Rack A-16', sub_location: 'Shelf 1' },
    { product_name: 'Thermal Sensor PT100', qty: 40, min_qty: 25, reorder_point: 35, location_area: 'Warehouse A', location: 'Rack A-13', sub_location: 'Bin 3' },
    { product_name: 'Coupling Flexible', qty: 16, min_qty: 12, reorder_point: 15, location_area: 'Warehouse B', location: 'Rack B-08', sub_location: 'Shelf 2' },
    { product_name: 'Emergency Stop Button', qty: 8, min_qty: 10, reorder_point: 15, location_area: 'Warehouse A', location: 'Rack A-11', sub_location: 'Drawer 1' },
    { product_name: 'Pressure Gauge 0-10bar', qty: 11, min_qty: 8, reorder_point: 10, location_area: 'Warehouse B', location: 'Rack B-06', sub_location: 'Shelf 3' },
    { product_name: 'Relay 24VDC', qty: 50, min_qty: 30, reorder_point: 40, location_area: 'Warehouse A', location: 'Rack A-14', sub_location: 'Bin 4' },
    { product_name: 'HMI Touch Panel 7"', qty: 4, min_qty: 2, reorder_point: 3, location_area: 'Warehouse B', location: 'Rack B-20', sub_location: 'Shelf 1' },
    { product_name: 'Safety Relay', qty: 15, min_qty: 5, reorder_point: 8, location_area: 'Warehouse A', location: 'Rack A-05', sub_location: 'Cabinet 2' },
    { product_name: 'Power Supply 24V 10A', qty: 10, min_qty: 5, reorder_point: 8, location_area: 'Warehouse B', location: 'Rack B-11', sub_location: 'Shelf 2' },
    { product_name: 'Ethernet Cable 5m', qty: 100, min_qty: 20, reorder_point: 30, location_area: 'Warehouse A', location: 'Rack A-30', sub_location: 'Bin 1' },
    { product_name: 'Fuse 2A', qty: 200, min_qty: 50, reorder_point: 80, location_area: 'Warehouse B', location: 'Rack B-02', sub_location: 'Drawer 5' }
];

// Sample maintenance logs from the past 7 days
const maintenanceLogs = [
    {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Andris Gerins',
        area: 'Cell 1',
        system: 'Conveyor',
        component: 'Motor',
        spare_part_used: 'AC Motor 3HP (Stock: 8)',
        action: 'Replaced',
        job_type: 'Repair',
        quantity: 1,
        duration: 45,
        work_status: 'Completed',
        remarks: 'Replaced faulty motor. System running normally.'
    },
    {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Mathews Lawrence',
        area: 'Cell 2',
        system: 'Robot',
        component: 'Servo',
        spare_part_used: 'Servo Motor 1KW (Stock: 2)',
        action: 'Replaced',
        job_type: 'Repair',
        quantity: 1,
        duration: 120,
        work_status: 'Completed',
        remarks: 'Servo motor overheating issue resolved. Replaced unit.'
    },
    {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Mykhailo Baranov',
        area: 'Cell 1',
        system: 'Hydraulics',
        component: 'Pump',
        spare_part_used: '',
        action: 'Inspected',
        job_type: 'Inspection',
        quantity: 0,
        duration: 30,
        work_status: 'Completed',
        remarks: 'Routine inspection completed. No issues found.'
    },
    {
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Samuel Martin',
        area: 'Cell 2',
        system: 'Conveyor',
        component: 'Belt',
        spare_part_used: 'V-Belt A50 (Stock: 12)',
        action: 'Replaced',
        job_type: 'Repair',
        quantity: 2,
        duration: 60,
        work_status: 'Completed',
        remarks: 'Replaced worn belts. Tension adjusted.'
    },
    {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Stepan Chividzhiyan',
        area: 'Cell 1',
        system: 'Pneumatics',
        component: 'Cylinder',
        spare_part_used: 'Pneumatic Cylinder (Stock: 5)',
        action: 'Replaced',
        job_type: 'Repair',
        quantity: 1,
        duration: 75,
        work_status: 'Completed',
        remarks: 'Cylinder leaking. Replaced and tested successfully.'
    },
    {
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Volodymyr Kalianov',
        area: 'Cell 2',
        system: 'Electrical',
        component: 'Contactor',
        spare_part_used: 'Contactor 25A (Stock: 18)',
        action: 'Replaced',
        job_type: 'Repair',
        quantity: 1,
        duration: 40,
        work_status: 'Completed',
        remarks: 'Contactor contacts burned. Replaced unit.'
    },
    {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Andris Gerins',
        area: 'Cell 1',
        system: 'Robot',
        component: 'Sensor',
        spare_part_used: 'Proximity Sensor (Stock: 45)',
        action: 'Replaced',
        job_type: 'Repair',
        quantity: 1,
        duration: 25,
        work_status: 'Completed',
        remarks: 'Sensor not detecting. Replaced and calibrated.'
    },
    {
        date: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
        engineer: 'Mathews Lawrence',
        area: 'Cell 2',
        system: 'Conveyor',
        component: 'Motor',
        spare_part_used: '',
        action: 'Cleaned',
        job_type: 'Cleaning',
        quantity: 0,
        duration: 20,
        work_status: 'Completed',
        remarks: 'Cleaned motor housing and cooling fins.'
    }
];

console.log('🔄 Starting database seeding...\n');

// Insert inventory items
db.serialize(() => {
    let inventoryCount = 0;
    inventoryItems.forEach((item, index) => {
        db.run(
            `INSERT INTO inventory (product_name, qty, min_qty, reorder_point, location_area, location, sub_location) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [item.product_name, item.qty, item.min_qty, item.reorder_point, item.location_area, item.location, item.sub_location],
            function (err) {
                if (err) {
                    console.error(`❌ Error adding ${item.product_name}:`, err.message);
                } else {
                    inventoryCount++;
                    console.log(`✅ Added: ${item.product_name} (Qty: ${item.qty}, Location: ${item.location})`);
                }

                if (index === inventoryItems.length - 1) {
                    console.log(`\n📦 Successfully added ${inventoryCount}/${inventoryItems.length} inventory items\n`);

                    // Insert maintenance logs
                    let logCount = 0;
                    maintenanceLogs.forEach((log, logIndex) => {
                        db.run(
                            `INSERT INTO logs (engineer, date_of_work, area, system, component, spare_part_used, action, quantity, duration, work_status, remarks)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [log.engineer, log.date, log.area, log.system, log.component, log.spare_part_used, log.action, log.quantity, log.duration, log.work_status, log.remarks],
                            function (err) {
                                if (err) {
                                    console.error(`❌ Error adding maintenance log:`, err.message);
                                } else {
                                    logCount++;
                                    console.log(`✅ Added maintenance log: ${log.engineer} - ${log.action} ${log.component}`);
                                }

                                if (logIndex === maintenanceLogs.length - 1) {
                                    console.log(`\n🔧 Successfully added ${logCount}/${maintenanceLogs.length} maintenance logs`);
                                    console.log('\n✨ Database seeding completed!\n');
                                    console.log('📊 Summary:');
                                    console.log(`   - ${inventoryCount} spare parts added`);
                                    console.log(`   - ${logCount} maintenance activities logged`);
                                    console.log(`   - Items needing reorder: ${inventoryItems.filter(i => i.qty <= i.reorder_point).length}`);
                                    console.log(`   - Low stock items: ${inventoryItems.filter(i => i.qty <= i.min_qty).length}`);
                                    console.log('\n🎉 Refresh your dashboard to see the data!');
                                    db.close();
                                }
                            }
                        );
                    });
                }
            }
        );
    });
});

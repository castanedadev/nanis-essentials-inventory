#!/usr/bin/env node

const fs = require('fs');

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US');
}

function isSinceSeptember1st(isoString) {
  const date = new Date(isoString);
  const september1st = new Date(date.getFullYear(), 8, 1); // Month is 0-indexed, so 8 = September
  return date >= september1st;
}

function extractItemsSold(backupFilePath) {
  try {
    // Read the backup file
    const jsonData = fs.readFileSync(backupFilePath, 'utf8');
    const db = JSON.parse(jsonData);

    // Validate the structure
    if (!db.sales || !db.items) {
      throw new Error('Invalid backup file - missing sales or items data');
    }

    console.log(`Found ${db.sales.length} total sales in backup`);
    console.log(`Found ${db.items.length} total items in inventory`);

    // Filter sales since September 1st
    const salesSinceSep1 = db.sales.filter(sale => isSinceSeptember1st(sale.createdAt));
    console.log(`Found ${salesSinceSep1.length} sales since September 1st`);

    // Create a map of items for quick lookup
    const itemsMap = new Map();
    db.items.forEach(item => {
      itemsMap.set(item.id, item);
    });

    // Extract and aggregate items sold
    const itemsSoldMap = new Map();

    salesSinceSep1.forEach(sale => {
      sale.lines.forEach(line => {
        const item = itemsMap.get(line.itemId);
        if (item) {
          const key = line.itemId;
          const existing = itemsSoldMap.get(key) || {
            itemId: line.itemId,
            itemName: item.name,
            description: item.description || '',
            totalQuantitySold: 0,
            totalRevenue: 0,
            salesCount: 0,
            sales: [],
          };

          existing.totalQuantitySold += line.quantity;
          existing.totalRevenue += line.quantity * line.unitPrice;
          existing.salesCount += 1;
          existing.sales.push({
            date: formatDate(sale.createdAt),
            buyerName: sale.buyerName || 'Unknown',
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalAmount: line.quantity * line.unitPrice,
            paymentMethod: sale.paymentMethod,
            channel: sale.channel || 'Unknown',
          });

          itemsSoldMap.set(key, existing);
        }
      });
    });

    const itemsSold = Array.from(itemsSoldMap.values());

    // Sort by total quantity sold (highest first)
    itemsSold.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

    console.log(`\nItems sold since September 1st: ${itemsSold.length} unique items`);
    console.log('='.repeat(80));

    // Generate CSV content
    const csvLines = [];

    // CSV Header
    csvLines.push(
      [
        'Item Name',
        'Total Quantity Sold',
        'Total Revenue',
        'Average Price per Unit',
        'Sale Dates',
        'Buyers',
        'Payment Methods',
        'Sales Channels',
      ].join(',')
    );

    // CSV Data
    itemsSold.forEach(item => {
      const avgPrice = item.totalRevenue / item.totalQuantitySold;
      const saleDates = item.sales.map(s => s.date).join('; ');
      const buyers = [...new Set(item.sales.map(s => s.buyerName))].join('; ');
      const paymentMethods = [...new Set(item.sales.map(s => s.paymentMethod))].join('; ');
      const channels = [...new Set(item.sales.map(s => s.channel))].join('; ');

      csvLines.push(
        [
          `"${item.itemName}"`,
          item.totalQuantitySold,
          item.totalRevenue.toFixed(2),
          avgPrice.toFixed(2),
          `"${saleDates}"`,
          `"${buyers}"`,
          `"${paymentMethods}"`,
          `"${channels}"`,
        ].join(',')
      );
    });

    // Calculate totals for CSV
    const csvTotalQuantity = itemsSold.reduce((sum, item) => sum + item.totalQuantitySold, 0);
    const csvTotalRevenue = itemsSold.reduce((sum, item) => sum + item.totalRevenue, 0);
    const csvTotalSales = itemsSold.reduce((sum, item) => sum + item.salesCount, 0);

    csvLines.push(''); // Empty line before totals
    csvLines.push(
      [
        '"TOTALS"',
        csvTotalQuantity,
        csvTotalRevenue.toFixed(2),
        `"Sales: ${csvTotalSales}"`,
        '""',
        '""',
        '""',
        '""',
      ].join(',')
    );

    // Generate filename with current month and year
    const now = new Date();
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const csvFileName = `${currentMonth} ${currentYear} - NANIS ESSENTIALS.csv`;
    fs.writeFileSync(csvFileName, csvLines.join('\n'));

    console.log(`\nCSV file generated: ${csvFileName}`);

    // Display summary
    console.log('\nSUMMARY:');
    console.log('-'.repeat(50));
    itemsSold.forEach((item, index) => {
      console.log(`${index + 1}. ${item.itemName}`);
      console.log(`   Quantity Sold: ${item.totalQuantitySold}`);
      console.log(`   Revenue: $${item.totalRevenue.toFixed(2)}`);
      console.log(`   Sales: ${item.salesCount}`);
      console.log(`   Avg Price: $${(item.totalRevenue / item.totalQuantitySold).toFixed(2)}`);
      console.log('');
    });

    const totalQuantity = itemsSold.reduce((sum, item) => sum + item.totalQuantitySold, 0);
    const totalRevenue = itemsSold.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalSales = itemsSold.reduce((sum, item) => sum + item.salesCount, 0);

    console.log('TOTALS:');
    console.log(`Total Items Sold: ${totalQuantity}`);
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total Sales Transactions: ${totalSales}`);
    console.log(`Unique Items: ${itemsSold.length}`);
  } catch (error) {
    console.error('Error processing backup file:', error.message);
    process.exit(1);
  }
}

// Get the backup file path from command line arguments
const backupFilePath = process.argv[2];

if (!backupFilePath) {
  console.log('Usage: node extract-items-sold.js <backup-file.json>');
  console.log('');
  console.log('Example: node extract-items-sold.js "Cosmetics Backup 2025-09-21 (1).json"');
  process.exit(1);
}

if (!fs.existsSync(backupFilePath)) {
  console.error(`Error: File "${backupFilePath}" not found.`);
  console.log('Please make sure the backup file exists and the path is correct.');
  process.exit(1);
}

extractItemsSold(backupFilePath);

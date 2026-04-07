/**
 * Reports.gs — LumiBooks v3
 * All report types, date range calculations, CSV export.
 */

function _getDateRange(filter) {
  var now = new Date();
  var from, to;

  if (filter.fromDate && filter.toDate) {
    from = new Date(filter.fromDate);
    to = new Date(filter.toDate);
  } else if (filter.period) {
    switch (filter.period) {
      case 'this_week':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        to = now;
        break;
      case 'this_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = now;
        break;
      case 'last_month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        var qMonth = Math.floor(now.getMonth() / 3) * 3;
        from = new Date(now.getFullYear(), qMonth, 1);
        to = now;
        break;
      case 'this_year':
        from = new Date(now.getFullYear(), 0, 1);
        to = now;
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = now;
    }
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = now;
  }

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from: from, to: to };
}

function getReport(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var type = sanitize(params.type) || 'financial';
    var filter = params.filter || {};
    var dateRange = _getDateRange(filter);
    var planConfig = getUserPlanConfig(userId);

    if (type === 'financial') return _getFinancialReport(userId, dateRange, planConfig);
    if (type === 'gst') return _getGSTReport(userId, dateRange, planConfig);
    if (type === 'category') return _getCategoryReport(userId, dateRange, planConfig);
    return jsonResponse({ success: false, error: 'Invalid report type.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function _getFinancialReport(userId, dateRange, planConfig) {
  var txnTab = getUserTab(userId, UTAB_TRANSACTIONS);
  var data = txnTab.getDataRange().getValues();
  var income = 0, expense = 0, gstCollected = 0;
  var incomeByCategory = {}, expenseByCategory = {};
  var transactions = [];

  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][1]);
    if (d < dateRange.from || d > dateRange.to) continue;

    var type = data[i][2];
    var cat = data[i][3];
    var amt = parseFloat(data[i][8]) || 0;
    var gst = parseFloat(data[i][7]) || 0;

    if (type === 'credit') {
      income += amt;
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
    } else {
      expense += amt;
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
    }
    gstCollected += gst;

    transactions.push({
      date: data[i][1], type: type, category: cat,
      description: data[i][4], amount: data[i][5], gst: gst, total: amt
    });
  }

  return jsonResponse({
    success: true, type: 'financial',
    period: { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
    summary: {
      totalIncome: Math.round(income * 100) / 100,
      totalExpense: Math.round(expense * 100) / 100,
      netProfit: Math.round((income - expense) * 100) / 100,
      gstCollected: Math.round(gstCollected * 100) / 100
    },
    incomeByCategory: incomeByCategory,
    expenseByCategory: expenseByCategory,
    transactions: transactions
  });
}

function _getGSTReport(userId, dateRange, planConfig) {
  var billTab = getUserTab(userId, UTAB_BILLS);
  var data = billTab.getDataRange().getValues();
  var totalCGST = 0, totalSGST = 0, totalIGST = 0, totalTaxable = 0;
  var bills = [];

  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][2]);
    if (d < dateRange.from || d > dateRange.to) continue;
    if (data[i][16] === 'cancelled') continue;

    var cgst = parseFloat(data[i][11]) || 0;
    var sgst = parseFloat(data[i][12]) || 0;
    var igst = parseFloat(data[i][13]) || 0;
    var sub = parseFloat(data[i][8]) || 0;

    totalCGST += cgst;
    totalSGST += sgst;
    totalIGST += igst;
    totalTaxable += sub;

    bills.push({
      billNumber: data[i][1], date: data[i][2], customerName: data[i][3],
      customerGSTIN: data[i][5], subtotal: sub, gstRate: data[i][10],
      cgst: cgst, sgst: sgst, igst: igst, total: data[i][14]
    });
  }

  return jsonResponse({
    success: true, type: 'gst',
    period: { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
    summary: {
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalCGST: Math.round(totalCGST * 100) / 100,
      totalSGST: Math.round(totalSGST * 100) / 100,
      totalIGST: Math.round(totalIGST * 100) / 100,
      totalGST: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100
    },
    bills: bills
  });
}

function _getCategoryReport(userId, dateRange, planConfig) {
  var txnTab = getUserTab(userId, UTAB_TRANSACTIONS);
  var data = txnTab.getDataRange().getValues();
  var breakdown = {};

  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][1]);
    if (d < dateRange.from || d > dateRange.to) continue;

    var cat = data[i][3];
    var type = data[i][2];
    var amt = parseFloat(data[i][8]) || 0;

    if (!breakdown[cat]) breakdown[cat] = { type: type, total: 0, count: 0 };
    breakdown[cat].total += amt;
    breakdown[cat].count++;
  }

  return jsonResponse({
    success: true, type: 'category',
    period: { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
    breakdown: breakdown
  });
}

// ═══════════════════════════════════════
// CSV EXPORT (Premium Only)
// ═══════════════════════════════════════
function exportCSV(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var planConfig = getUserPlanConfig(userId);
    if (!planConfig.hasCSVExport) return jsonResponse({ success: false, error: 'CSV export is available on Premium plan and above.' });

    var type = sanitize(params.type) || 'transactions';
    var filter = params.filter || {};
    var dateRange = _getDateRange(filter);
    var csv = '';

    if (type === 'transactions') {
      csv = _buildTransactionCSV(userId, dateRange);
    } else if (type === 'bills') {
      csv = _buildBillCSV(userId, dateRange);
    } else if (type === 'customers') {
      csv = _buildCustomerCSV(userId);
    } else if (type === 'stock') {
      csv = _buildStockCSV(userId);
    } else {
      return jsonResponse({ success: false, error: 'Invalid export type.' });
    }

    return ContentService.createTextOutput(csv)
      .setMimeType(ContentService.MimeType.CSV);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function _buildTransactionCSV(userId, dateRange) {
  var tab = getUserTab(userId, UTAB_TRANSACTIONS);
  var data = tab.getDataRange().getValues();
  var lines = ['Date,Type,Category,Description,Amount,GST Rate,GST Amount,Total'];
  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][1]);
    if (d < dateRange.from || d > dateRange.to) continue;
    lines.push([
      data[i][1], data[i][2], '"' + (data[i][3] || '').replace(/"/g, '""') + '"',
      '"' + (data[i][4] || '').replace(/"/g, '""') + '"',
      data[i][5], data[i][6], data[i][7], data[i][8]
    ].join(','));
  }
  return lines.join('\n');
}

function _buildBillCSV(userId, dateRange) {
  var tab = getUserTab(userId, UTAB_BILLS);
  var data = tab.getDataRange().getValues();
  var lines = ['Bill Number,Date,Customer,GSTIN,Subtotal,CGST,SGST,IGST,Total,Status'];
  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][2]);
    if (d < dateRange.from || d > dateRange.to) continue;
    lines.push([
      data[i][1], data[i][2], '"' + (data[i][3] || '').replace(/"/g, '""') + '"',
      data[i][5] || '', data[i][8], data[i][11], data[i][12], data[i][13], data[i][14], data[i][16]
    ].join(','));
  }
  return lines.join('\n');
}

function _buildCustomerCSV(userId) {
  var tab = getUserTab(userId, UTAB_CUSTOMERS);
  var data = tab.getDataRange().getValues();
  var lines = ['Name,Phone,Email,GSTIN,Address'];
  for (var i = 1; i < data.length; i++) {
    lines.push([
      '"' + (data[i][1] || '').replace(/"/g, '""') + '"', data[i][2] || '',
      data[i][3] || '', data[i][4] || '',
      '"' + (data[i][5] || '').replace(/"/g, '""') + '"'
    ].join(','));
  }
  return lines.join('\n');
}

function _buildStockCSV(userId) {
  var tab = getUserTab(userId, UTAB_STOCK);
  var data = tab.getDataRange().getValues();
  var lines = ['SKU,Name,Category,Unit,Cost Price,Sell Price,Quantity,Reorder Level'];
  for (var i = 1; i < data.length; i++) {
    lines.push([
      data[i][1] || '', '"' + (data[i][2] || '').replace(/"/g, '""') + '"',
      data[i][3] || '', data[i][4] || '', data[i][5], data[i][6], data[i][7], data[i][8]
    ].join(','));
  }
  return lines.join('\n');
}
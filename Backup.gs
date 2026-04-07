/**
 * Backup.gs — LumiBooks v3
 * Data backup: creates filtered Google Sheet per user request.
 * Premium+ only. Max 1 per 24h. Max 10 stored.
 * Each module gets its own tab in an easy-to-understand format.
 */

function requestBackup(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var planConfig = getUserPlanConfig(userId);
    if (!planConfig.hasPDF) return jsonResponse({ success: false, error: 'Data backup is available on Premium plan and above.' });

    // Check cooldown
    var folder = getUserFolder(userId);
    if (!folder) return jsonResponse({ success: false, error: 'Something went wrong.' });

    var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    var backupFiles = [];
    while (files.hasNext()) {
      var f = files.next();
      if (f.getName().indexOf('LumiBooks_Backup_') === 0) {
        backupFiles.push({ id: f.getId(), name: f.getName(), date: f.getLastUpdated() });
      }
    }

    // Check cooldown (24h)
    if (backupFiles.length > 0) {
      backupFiles.sort(function(a, b) { return b.date - a.date; });
      var lastBackup = backupFiles[0].date;
      var elapsed = Date.now() - lastBackup.getTime();
      if (elapsed < BACKUP_COOLDOWN_MS) {
        var remaining = Math.ceil((BACKUP_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
        return jsonResponse({ success: false, error: 'You can request a backup once every 24 hours. Please try again in ' + remaining + ' hour(s).' });
      }
    }

    // Delete oldest if over limit
    if (backupFiles.length >= BACKUP_MAX_PER_USER) {
      backupFiles.sort(function(a, b) { return a.date - b.date; });
      for (var d = 0; d < backupFiles.length - BACKUP_MAX_PER_USER + 1; d++) {
        DriveApp.getFileById(backupFiles[d].id).setTrashed(true);
      }
    }

    // Create backup sheet
    var now = new Date();
    var sheetName = 'LumiBooks_Backup_' + now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    var backupSS = SpreadsheetApp.create(sheetName);
    var file = DriveApp.getFileById(backupSS.getId());
    DriveApp.Files.move(file, folder);

    // Remove default Sheet1
    var defSheet = backupSS.getSheetByName('Sheet1');
    if (defSheet) backupSS.deleteSheet(defSheet);

    // Build each tab
    _formatSummaryTab(backupSS, userId);
    _formatTransactionsSheet(backupSS, userId);
    _formatBillsSheet(backupSS, userId);
    _formatStockSheet(backupSS, userId);
    _formatCustomersSheet(backupSS, userId);
    _formatPaymentsSheet(backupSS, userId);
    _formatStaffSheet(backupSS, userId);
    _formatAttendanceSheet(backupSS, userId);
    _formatStaffPaymentsSheet(backupSS, userId);
    _formatCategoriesSheet(backupSS, userId);

    return jsonResponse({
      success: true,
      message: 'Backup created successfully.',
      sheetName: sheetName,
      sheetId: backupSS.getId(),
      driveUrl: 'https://drive.google.com/file/d/' + backupSS.getId() + '/view'
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

function getBackupHistory(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var folder = getUserFolder(userId);
    if (!folder) return jsonResponse({ success: true, backups: [] });

    var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    var backups = [];
    while (files.hasNext()) {
      var f = files.next();
      if (f.getName().indexOf('LumiBooks_Backup_') === 0) {
        backups.push({
          name: f.getName(),
          id: f.getId(),
          url: 'https://drive.google.com/file/d/' + f.getId() + '/view',
          createdAt: f.getLastUpdated().toISOString()
        });
      }
    }

    backups.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return jsonResponse({ success: true, backups: backups });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// BACKUP TAB BUILDERS
// ═══════════════════════════════════════

function _formatSummaryTab(ss, userId) {
  var tab = ss.insertSheet('Summary');
  tab.getRange(1, 1).setValue('LumiBooks Data Backup Summary').setFontSize(14).setFontWeight('bold');
  tab.getRange(2, 1).setValue('Generated: ' + new Date().toLocaleString('en-IN')).setFontWeight('bold');

  var counts = {
    'Total Transactions': _countRows(userId, UTAB_TRANSACTIONS),
    'Total Bills': _countRows(userId, UTAB_BILLS),
    'Total Stock Items': _countRows(userId, UTAB_STOCK),
    'Total Customers': _countRows(userId, UTAB_CUSTOMERS),
    'Total Staff': _countRows(userId, UTAB_STAFF),
    'Total Customer Payments': _countRows(userId, UTAB_CUST_PAYMENTS),
    'Total Attendance Records': _countRows(userId, UTAB_ATTENDANCE),
    'Total Staff Payments': _countRows(userId, UTAB_STAFF_PAYMENTS)
  };

  var row = 4;
  tab.getRange(row, 1, 1, 2).setValues([['Metric', 'Count']]).setFontWeight('bold');
  tab.getRange(row, 1, 1, 2).setBackground('#378ADD').setFontColor('#FFFFFF');
  row++;
  for (var key in counts) {
    tab.getRange(row, 1, 1, 2).setValues([[key, counts[key]]]);
    row++;
  }
  tab.setColumnWidth(1, 280);
  tab.setColumnWidth(2, 120);
}

function _formatTransactionsSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_TRANSACTIONS);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Transactions');
  var headers = ['Date', 'Type', 'Category', 'Description', 'Amount (₹)', 'GST Rate (%)', 'GST Amount (₹)', 'Total (₹)'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#1D9E75').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][1]);
    out.push([
      _fmtDate(d), data[i][2], data[i][3], data[i][4] || '-',
      data[i][5], data[i][6], data[i][7], data[i][8]
    ]);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);

  // Totals row
  var totalRow = out.length + 2;
  tab.getRange(totalRow, 4).setValue('TOTAL').setFontWeight('bold');
  tab.getRange(totalRow, 5).setFormula('=SUM(E2:E' + (out.length + 1) + ')').setFontWeight('bold');
  tab.getRange(totalRow, 7).setFormula('=SUM(G2:G' + (out.length + 1) + ')').setFontWeight('bold');
  tab.getRange(totalRow, 8).setFormula('=SUM(H2:H' + (out.length + 1) + ')').setFontWeight('bold');

  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 160);
  tab.setFrozenRows(1);
  tab.getRange(2, 1, out.length, headers.length).setAutoFilter(tab.getRange(2, 1, out.length, headers.length));
}

function _formatBillsSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_BILLS);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Bills');
  var headers = ['Bill No', 'Date', 'Customer', 'Phone', 'GSTIN', 'Subtotal (₹)', 'GST Type', 'GST Rate (%)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total (₹)', 'Template', 'Status', 'Warranty'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#BA7517').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    out.push([
      data[i][1], _fmtDate(new Date(data[i][2])), data[i][3] || '-',
      data[i][4] || '-', data[i][5] || '-', data[i][8],
      data[i][9] || '-', data[i][10], data[i][11], data[i][12], data[i][13],
      data[i][14], data[i][15], data[i][16], data[i][19] ? (data[i][20] || 'Yes') : 'No'
    ]);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 130);
  tab.setFrozenRows(1);
}

function _formatStockSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_STOCK);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Stock');
  var headers = ['SKU', 'Name', 'Category', 'Unit', 'Cost Price (₹)', 'Sell Price (₹)', 'Current Qty', 'Reorder Level', 'Status'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#7F77DD').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var qty = parseFloat(data[i][7]) || 0;
    var reorder = parseFloat(data[i][8]) || 0;
    var status = qty <= reorder && reorder > 0 ? 'LOW STOCK' : 'OK';
    out.push([data[i][1] || '-', data[i][2], data[i][3] || '-', data[i][4] || '-', data[i][5], data[i][6], qty, reorder, status]);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 140);
  tab.setFrozenRows(1);
}

function _formatCustomersSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_CUSTOMERS);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Customers');
  var headers = ['Name', 'Phone', 'Email', 'GSTIN', 'Address', 'Credit Limit (₹)'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#D4537E').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    out.push([data[i][1] || '-', data[i][2] || '-', data[i][3] || '-', data[i][4] || '-', data[i][5] || '-', data[i][6] || 0]);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 180);
  tab.setFrozenRows(1);
}

function _formatPaymentsSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_CUST_PAYMENTS);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Customer Payments');
  var headers = ['Date', 'Customer ID', 'Amount (₹)', 'Mode', 'Against Bill', 'Notes'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#639922').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    out.push([_fmtDate(new Date(data[i][2])), data[i][1], data[i][3], data[i][4] || '-', data[i][5] || '-', data[i][6] || '-']);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 160);
  tab.setFrozenRows(1);
}

function _formatStaffSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_STAFF);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Staff');
  var headers = ['Name', 'Role', 'Department', 'Salary Type', 'Salary (₹)', 'Bank Account', 'Status'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#378ADD').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    out.push([data[i][1], data[i][2] || '-', data[i][3] || '-', data[i][4] || '-', data[i][5], data[i][6] ? '****' + String(data[i][6]).slice(-4) : '-', data[i][9]]);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 150);
  tab.setFrozenRows(1);
}

function _formatAttendanceSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_ATTENDANCE);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Attendance');
  var headers = ['Staff ID', 'Date', 'Status', 'Check In', 'Check Out'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0C447C').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    out.push([data[i][1], _fmtDate(new Date(data[i][2])), data[i][3] || '-', data[i][4] || '-', data[i][5] || '-']);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 150);
  tab.setFrozenRows(1);
}

function _formatStaffPaymentsSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_STAFF_PAYMENTS);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Staff Payments');
  var headers = ['Staff ID', 'Month', 'Year', 'Amount (₹)', 'Type', 'Mode', 'Notes'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#633806').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    out.push([data[i][1], data[i][2], data[i][3], data[i][4], data[i][5], data[i][6] || '-', data[i][7] || '-']);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 140);
  tab.setFrozenRows(1);
}

function _formatCategoriesSheet(ss, userId) {
  var srcTab = getUserTab(userId, UTAB_CATEGORIES);
  if (!srcTab || srcTab.getLastRow() <= 1) return;

  var tab = ss.insertSheet('Categories');
  var headers = ['Name', 'Type', 'Icon', 'Color', 'Default'];
  tab.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#666666').setFontColor('#FFFFFF');

  var data = srcTab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    out.push([data[i][1], data[i][2], data[i][3] || '-', data[i][4] || '-', data[i][6] === true ? 'Yes' : 'No']);
  }
  if (out.length > 0) tab.getRange(2, 1, out.length, headers.length).setValues(out);
  for (var c = 1; c <= headers.length; c++) tab.setColumnWidth(c, 140);
  tab.setFrozenRows(1);
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function _countRows(userId, tabName) {
  var tab = getUserTab(userId, tabName);
  if (!tab) return 0;
  return Math.max(0, tab.getLastRow() - 1);
}

function _fmtDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '-';
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return String(d.getDate()).padStart(2, '0') + '-' + months[d.getMonth()] + '-' + d.getFullYear();
}
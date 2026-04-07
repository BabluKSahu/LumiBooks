/**
 * Code.gs — LumiBooks v3
 * Router: doGet(), doPost(), public API manifest.
 * All business logic is in other .gs files.
 */

// ═══════════════════════════════════════
// doGet — Route HTML page requests
// ═══════════════════════════════════════
function doGet(e) {
  var page = (e.parameter && e.parameter.page) ? e.parameter.page : 'landing';

  // Admin panel — secret access, no HTML file
  if (page === ADMIN_SECRET_PARAM) {
    return adminDoGet(e);
  }

  // Customer bill portal
  if (page === 'portal') {
    return portalDoGet(e);
  }

  // App page — served but session validated client-side
  if (page === 'app') {
    var html = HtmlService.createHtmlOutputFromFile('app')
      .setTitle('LumiBooks — Business Management')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    return html;
  }

  // Default: landing page
  var landingHtml = HtmlService.createHtmlOutputFromFile('landing')
    .setTitle('LumiBooks — Free Business Management for Indian Businesses')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return landingHtml;
}

// ═══════════════════════════════════════
// doPost — Route all API requests
// ═══════════════════════════════════════
function doPost(e) {
  try {
    var body = parseBody(e);
    if (!body || !body.action) {
      return jsonResponse({ success: false, error: 'Invalid request.' });
    }

    var action = body.action;
    var params = body.params || {};

    // ── Auth routes ──
    if (action === 'register') return registerUser(params);
    if (action === 'login') return loginUser(params);
    if (action === 'logout') return logoutUser(params);
    if (action === 'validateSession') return validateSession(params);
    if (action === 'getProfile') return getProfile(params);
    if (action === 'updateProfile') return updateProfile(params);
    if (action === 'changePassword') return changePassword(params);
    if (action === 'requestPasswordReset') return requestPasswordReset(params);
    if (action === 'verifyResetToken') return verifyResetToken(params);
    if (action === 'resetPassword') return resetPassword(params);
    if (action === 'submitContactForm') return submitContactForm(params);

    // ── Transaction routes ──
    if (action === 'addTransaction') return addTransaction(params);
    if (action === 'getTransactions') return getTransactions(params);
    if (action === 'updateTransaction') return updateTransaction(params);
    if (action === 'deleteTransaction') return deleteTransaction(params);
    if (action === 'getDashboardSummary') return getDashboardSummary(params);
    if (action === 'globalSearch') return globalSearch(params);

    // ── Category routes ──
    if (action === 'getCategories') return getCategories(params);
    if (action === 'addCategory') return addCategory(params);
    if (action === 'updateCategory') return updateCategory(params);
    if (action === 'deleteCategory') return deleteCategory(params);

    // ── Bill routes ──
    if (action === 'saveEstimate') return saveEstimate(params);
    if (action === 'getEstimate') return getEstimate(params);
    if (action === 'updateEstimate') return updateEstimate(params);
    if (action === 'listEstimates') return listEstimates(params);
    if (action === 'deleteEstimate') return deleteEstimate(params);
    if (action === 'buildWhatsAppMessage') return buildWhatsAppMessage(params);
    if (action === 'updateEstimateStatus') return updateEstimateStatus(params);

    // ── Stock routes ──
    if (action === 'addStockItem') return addStockItem(params);
    if (action === 'getStockItems') return getStockItems(params);
    if (action === 'updateStockItem') return updateStockItem(params);
    if (action === 'deleteStockItem') return deleteStockItem(params);
    if (action === 'adjustStock') return adjustStock(params);
    if (action === 'getLowStockItems') return getLowStockItems(params);
    if (action === 'getStockReport') return getStockReportData(params);

    // ── Customer routes ──
    if (action === 'addCustomer') return addCustomer(params);
    if (action === 'getCustomers') return getCustomers(params);
    if (action === 'updateCustomer') return updateCustomer(params);
    if (action === 'deleteCustomer') return deleteCustomer(params);
    if (action === 'getCustomerStatement') return getCustomerStatement(params);
    if (action === 'addCustomerPayment') return addCustomerPayment(params);
    if (action === 'getCustomerPayments') return getCustomerPayments(params);
    if (action === 'getWarrantyClaims') return getWarrantyClaims(params);

    // ── Staff routes ──
    if (action === 'addStaff') return addStaff(params);
    if (action === 'getStaff') return getStaff(params);
    if (action === 'updateStaff') return updateStaff(params);
    if (action === 'deleteStaff') return deleteStaff(params);
    if (action === 'markAttendance') return markAttendance(params);
    if (action === 'getAttendance') return getAttendance(params);
    if (action === 'addStaffPayment') return addStaffPayment(params);
    if (action === 'getStaffPayments') return getStaffPayments(params);
    if (action === 'getStaffReport') return getStaffReportData(params);

    // ── Report routes ──
    if (action === 'getReport') return getReport(params);
    if (action === 'exportCSV') return exportCSV(params);

    // ── Export routes ──
    if (action === 'generatePDF') return generatePDF(params);
    if (action === 'generateDOC') return generateDOC(params);

    // ── Backup routes ──
    if (action === 'requestBackup') return requestBackup(params);
    if (action === 'getBackupHistory') return getBackupHistory(params);

    // ── Payment routes ──
    if (action === 'submitPayment') return submitPayment(params);
    if (action === 'getPaymentStatus') return getPaymentStatus(params);
    if (action === 'submitTicket') return submitTicket(params);

    // ── Broadcast route ──
    if (action === 'getBroadcast') return getBroadcast(params);

    // ── Admin routes ──
    if (action.startsWith('admin_')) {
      return adminDoPost(action, params);
    }

    return jsonResponse({ success: false, error: 'Unknown action.' });

  } catch (err) {
    // NEVER expose error details to user
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function _capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Clean up expired sessions — called by time trigger daily
 */
function cleanupExpiredSessions() {
  var tab = getMasterTab(TAB_SESSIONS);
  var data = tab.getDataRange().getValues();
  var now = new Date().getTime();
  var toDelete = [];
  for (var i = 1; i < data.length; i++) {
    var expiresAt = new Date(data[i][3]).getTime();
    if (now > expiresAt) {
      toDelete.push(i + 1);
    }
  }
  // Delete from bottom up to preserve row indices
  for (var j = toDelete.length - 1; j >= 0; j--) {
    tab.deleteRow(toDelete[j]);
  }
}

/**
 * Check premium expiry for all users — called by time trigger daily
 */
function checkPremiumExpiry() {
  var tab = getMasterTab(TAB_USERS);
  var data = tab.getDataRange().getValues();
  var now = new Date();
  for (var i = 1; i < data.length; i++) {
    var planKey = String(data[i][6]).toLowerCase();
    var expiry = data[i][7];
    if (planKey !== 'free' && expiry) {
      if (new Date(expiry) < now) {
        tab.getRange(i + 1, 7, 1, 2).setValues([['free', '']]);
      }
    }
  }
}
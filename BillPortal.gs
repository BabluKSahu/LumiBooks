/**
 * BillPortal.gs — LumiBooks v3
 * Customer-facing bill portal: token validation, bill rendering, warranty claims.
 * No login required. Token-signed for security.
 */

function portalDoGet(e) {
  var token = (e.parameter && e.parameter.t) ? e.parameter.t : '';

  if (!token) {
    return HtmlService.createHtmlOutput('<h3>Invalid bill link.</h3>')
      .setTitle('LumiBooks — Bill Portal');
  }

  // Find bill by share token (search all user sheets)
  var billData = _findBillByToken(token);
  if (!billData) {
    return HtmlService.createHtmlOutput('<h3>This bill link is invalid or has expired.</h3>')
      .setTitle('LumiBooks — Bill Portal');
  }

  // Get business profile for branding
  var profileData = _getBusinessProfile(billData.userId);

  // Pass data to portal.html via template
  var html = HtmlService.createTemplateFromFile('portal');
  html.bill = billData;
  html.profile = profileData;
  html.token = token;
  html.serviceUrl = ScriptApp.getService().getUrl();

  return html.evaluate()
    .setTitle('Bill — ' + billData.billNumber)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Find bill by share token across all user sheets
 */
function _findBillByToken(token) {
  var userTab = getMasterTab(TAB_USERS);
  var users = userTab.getDataRange().getValues();

  for (var u = 1; u < users.length; u++) {
    var userId = users[u][0];
    var billTab = getUserTab(userId, UTAB_BILLS);
    if (!billTab) continue;

    var data = billTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][17] === token) {
        // Check expiry
        var expiry = new Date(data[i][18]);
        if (expiry < new Date()) continue;

        var items = [];
        try { items = JSON.parse(data[i][7]); } catch (e) {}

        var planConfig = getUserPlanConfig(userId);

        return {
          userId: userId,
          billId: data[i][0], billNumber: data[i][1], date: data[i][2],
          customerName: data[i][3], customerPhone: data[i][4],
          customerGSTIN: data[i][5], customerAddress: data[i][6],
          items: items, subtotal: data[i][8], gstType: data[i][9],
          gstRate: data[i][10], cgstAmount: data[i][11], sgstAmount: data[i][12],
          igstAmount: data[i][13], totalAmount: data[i][14],
          template: data[i][15], status: data[i][16],
          warrantyEnabled: data[i][19] === true, warrantyPeriod: data[i][20],
          customNotes: data[i][21],
          hasPDF: planConfig.hasPDF, hasPrint: planConfig.hasCustomerPrint,
          hasWarranty: planConfig.hasWarranty
        };
      }
    }
  }
  return null;
}

/**
 * Get business profile data for bill rendering
 */
function _getBusinessProfile(userId) {
  var profileTab = getUserTab(userId, UTAB_PROFILE);
  if (!profileTab) return {};
  var data = profileTab.getDataRange().getValues();
  var profile = {};
  for (var i = 1; i < data.length; i++) {
    profile[data[i][0]] = data[i][1];
  }
  return profile;
}

// ═══════════════════════════════════════
// PUBLIC BILL API (for portal.html AJAX)
// ═══════════════════════════════════════
function getPublicBill(params) {
  var token = sanitize(params.token);
  if (!token) return jsonResponse({ success: false, error: 'Invalid link.' });
  var bill = _findBillByToken(token);
  if (!bill) return jsonResponse({ success: false, error: 'Bill not found or link expired.' });
  return jsonResponse({ success: true, bill: bill });
}

function submitWarrantyClaim(params) {
  var token = sanitize(params.token);
  if (!token) return jsonResponse({ success: false, error: 'Invalid link.' });

  var bill = _findBillByToken(token);
  if (!bill) return jsonResponse({ success: false, error: 'Bill not found or link expired.' });
  if (!bill.hasWarranty) return jsonResponse({ success: false, error: 'Warranty claims are not available for this bill.' });

  var issueDescription = sanitize(params.issueDescription);
  if (!issueDescription || issueDescription.length < 10) {
    return jsonResponse({ success: false, error: 'Please describe the issue (min 10 characters).' });
  }

  var warrantyTab = getUserTab(bill.userId, UTAB_WARRANTY);
  if (!warrantyTab) return jsonResponse({ success: false, error: 'Something went wrong.' });

  warrantyTab.appendRow([
    Utilities.getUuid(), bill.billId, bill.billNumber,
    bill.customerName, bill.customerPhone,
    issueDescription, 'open', '', new Date().toISOString()
  ]);

  return jsonResponse({ success: true, message: 'Warranty claim submitted successfully. The business will review and contact you.' });
}

function getWarrantyStatus(params) {
  var token = sanitize(params.token);
  if (!token) return jsonResponse({ success: false, error: 'Invalid link.' });

  var bill = _findBillByToken(token);
  if (!bill) return jsonResponse({ success: false, error: 'Bill not found.' });

  var warrantyTab = getUserTab(bill.userId, UTAB_WARRANTY);
  if (!warrantyTab) return jsonResponse({ success: true, claims: [] });

  var data = warrantyTab.getDataRange().getValues();
  var claims = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === bill.billId) {
      claims.push({
        claimId: data[i][0], billNumber: data[i][2],
        issueDescription: data[i][5], status: data[i][6],
        adminNotes: data[i][7], createdAt: data[i][8]
      });
    }
  }

  return jsonResponse({ success: true, claims: claims });
}
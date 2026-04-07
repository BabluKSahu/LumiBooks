/**
 * Estimates.gs — LumiBooks v3
 * Bill CRUD, templates, GST, edit lock, share tokens, WhatsApp message builder.
 */

function saveEstimate(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var planConfig = getUserPlanConfig(userId);

    // Check bill count limit
    var billTab = getUserTab(userId, UTAB_BILLS);
    var existingCount = Math.max(0, billTab.getLastRow() - 1);
    var limitCheck = checkPlanLimit(userId, 'totalBills', existingCount);
    if (!limitCheck.ok) return jsonResponse({ success: false, error: 'Bill limit reached (' + limitCheck.limit + '). Upgrade your plan.' });

    var template = sanitize(params.template);
    if (planConfig.templates.indexOf(template) === -1) return jsonResponse({ success: false, error: 'This template is not available on your plan.' });

    var isGST = ['gst-standard', 'professional', 'gst-premium', 'enterprise-custom'].indexOf(template) !== -1;
    if (isGST && !planConfig.hasGST) return jsonResponse({ success: false, error: 'GST billing requires Standard plan or above.' });

    var items = params.items;
    if (!items || !Array.isArray(items) || items.length === 0) return jsonResponse({ success: false, error: 'At least one item is required.' });

    var customerName = sanitize(params.customerName);
    var customerPhone = sanitizePhone(params.customerPhone);
    var customerGSTIN = isGST ? sanitizeGSTIN(params.customerGSTIN) : '';
    var customerAddress = sanitize(params.customerAddress);
    var date = params.date || new Date().toISOString().split('T')[0];
    var gstType = sanitize(params.gstType) || 'intra'; // intra or inter
    var gstRate = sanitizeNumber(params.gstRate) || 0;
    var warrantyEnabled = params.warrantyEnabled === true && planConfig.hasWarranty;
    var warrantyPeriod = sanitize(params.warrantyPeriod) || '';
    var customNotes = sanitize(params.customNotes) || '';

    // Calculate totals
    var subtotal = 0;
    for (var i = 0; i < items.length; i++) {
      var qty = sanitizeNumber(items[i].quantity) || 0;
      var price = sanitizeNumber(items[i].price) || 0;
      subtotal += qty * price;
      items[i].quantity = qty;
      items[i].price = price;
      items[i].total = Math.round(qty * price * 100) / 100;
    }

    var cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    if (isGST && gstRate > 0) {
      var gstAmount = (subtotal * gstRate) / 100;
      if (gstType === 'inter') {
        igstAmount = Math.round(gstAmount * 100) / 100;
      } else {
        cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
        sgstAmount = Math.round((gstAmount / 2) * 100) / 100;
      }
    }

    var totalAmount = Math.round((subtotal + cgstAmount + sgstAmount + igstAmount) * 100) / 100;
    var billNumber = getNextBillNumber(userId);
    var billId = 'BIL_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);

    billTab.appendRow([
      billId, billNumber, date, customerName, customerPhone, customerGSTIN, customerAddress,
      JSON.stringify(items), subtotal, gstType, gstRate, cgstAmount, sgstAmount, igstAmount,
      totalAmount, template, 'draft', '', '', warrantyEnabled, warrantyPeriod, customNotes,
      new Date().toISOString(), new Date().toISOString()
    ]);

    // Auto-deduct stock if items have SKU
    if (params.deductStock) {
      var stockTab = getUserTab(userId, UTAB_STOCK);
      if (stockTab) {
        var sData = stockTab.getDataRange().getValues();
        for (var j = 0; j < items.length; j++) {
          if (items[j].sku) {
            for (var k = 1; k < sData.length; k++) {
              if (String(sData[k][1]).toLowerCase() === String(items[j].sku).toLowerCase()) {
                var newQty = Math.max(0, (parseFloat(sData[k][7]) || 0) - items[j].quantity);
                stockTab.getRange(k + 1, 8).setValue(newQty);
                break;
              }
            }
          }
        }
      }
    }

    return jsonResponse({
      success: true, billId: billId, billNumber: billNumber,
      totalAmount: totalAmount, message: 'Bill saved as draft.'
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

function getEstimate(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var billId = sanitize(params.billId);
    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === billId) {
        var items = [];
        try { items = JSON.parse(data[i][7]); } catch (e) { items = []; }
        return jsonResponse({
          success: true,
          bill: {
            billId: data[i][0], billNumber: data[i][1], date: data[i][2],
            customerName: data[i][3], customerPhone: data[i][4], customerGSTIN: data[i][5],
            customerAddress: data[i][6], items: items, subtotal: data[i][8],
            gstType: data[i][9], gstRate: data[i][10], cgstAmount: data[i][11],
            sgstAmount: data[i][12], igstAmount: data[i][13], totalAmount: data[i][14],
            template: data[i][15], status: data[i][16], shareToken: data[i][17],
            warrantyEnabled: data[i][19], warrantyPeriod: data[i][20],
            customNotes: data[i][21], createdAt: data[i][22], updatedAt: data[i][23]
          }
        });
      }
    }
    return jsonResponse({ success: false, error: 'Bill not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function updateEstimate(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var billId = sanitize(params.billId);
    var planConfig = getUserPlanConfig(userId);
    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();
    var row = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === billId) { row = i; break; }
    }
    if (row === -1) return jsonResponse({ success: false, error: 'Bill not found.' });

    // Check edit window
    var createdDate = new Date(data[row][22]);
    var editWindowMs = planConfig.billEditWindowHours * 60 * 60 * 1000;
    if (Date.now() - createdDate.getTime() > editWindowMs) {
      return jsonResponse({ success: false, error: 'Edit window expired (' + planConfig.billEditWindowHours + ' hours). This bill can no longer be edited.' });
    }

    // Update allowed fields
    if (params.customerName) billTab.getRange(row + 1, 4).setValue(sanitize(params.customerName));
    if (params.customerPhone) billTab.getRange(row + 1, 5).setValue(sanitizePhone(params.customerPhone));
    if (params.customerGSTIN) billTab.getRange(row + 1, 6).setValue(sanitizeGSTIN(params.customerGSTIN));
    if (params.customerAddress) billTab.getRange(row + 1, 7).setValue(sanitize(params.customerAddress));
    if (params.customNotes !== undefined) billTab.getRange(row + 1, 22).setValue(sanitize(params.customNotes));
    if (params.status) billTab.getRange(row + 1, 17).setValue(sanitize(params.status));

    // Recalculate if items changed
    if (params.items && Array.isArray(params.items)) {
      var items = params.items;
      var subtotal = 0;
      for (var j = 0; j < items.length; j++) {
        var qty = sanitizeNumber(items[j].quantity) || 0;
        var price = sanitizeNumber(items[j].price) || 0;
        subtotal += qty * price;
        items[j].quantity = qty;
        items[j].price = price;
        items[j].total = Math.round(qty * price * 100) / 100;
      }
      var gstRate = sanitizeNumber(params.gstRate) || parseFloat(data[row][10]) || 0;
      var gstType = sanitize(params.gstType) || data[row][9] || 'intra';
      var cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
      if (gstRate > 0) {
        var gstAmount = (subtotal * gstRate) / 100;
        if (gstType === 'inter') { igstAmount = Math.round(gstAmount * 100) / 100; }
        else { cgstAmount = Math.round((gstAmount / 2) * 100) / 100; sgstAmount = Math.round((gstAmount / 2) * 100) / 100; }
      }
      var totalAmount = Math.round((subtotal + cgstAmount + sgstAmount + igstAmount) * 100) / 100;

      billTab.getRange(row + 1, 8).setValue(subtotal);
      billTab.getRange(row + 1, 9).setValue(gstType);
      billTab.getRange(row + 1, 10).setValue(gstRate);
      billTab.getRange(row + 1, 11).setValue(cgstAmount);
      billTab.getRange(row + 1, 12).setValue(sgstAmount);
      billTab.getRange(row + 1, 13).setValue(igstAmount);
      billTab.getRange(row + 1, 14).setValue(totalAmount);
      billTab.getRange(row + 1, 7).setValue(JSON.stringify(items));
    }

    billTab.getRange(row + 1, 24).setValue(new Date().toISOString());
    return jsonResponse({ success: true, message: 'Bill updated.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function listEstimates(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();
    var filter = params.filter || {};
    var bills = [];

    for (var i = data.length - 1; i >= 1; i--) {
      var bill = {
        billId: data[i][0], billNumber: data[i][1], date: data[i][2],
        customerName: data[i][3], totalAmount: data[i][14], template: data[i][15],
        status: data[i][16], hasShareToken: !!data[i][17],
        warrantyEnabled: data[i][19] === true, createdAt: data[i][22]
      };
      if (filter.status && bill.status !== filter.status) continue;
      if (filter.search) {
        var s = filter.search.toLowerCase();
        if (bill.customerName.toLowerCase().indexOf(s) === -1 && bill.billNumber.toLowerCase().indexOf(s) === -1) continue;
      }
      bills.push(bill);
    }

    return jsonResponse({ success: true, bills: bills, total: bills.length });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function deleteEstimate(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var billId = sanitize(params.billId);
    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === billId) {
        if (data[i][16] === 'shared') return jsonResponse({ success: false, error: 'Cannot delete a shared bill. Unshare it first.' });
        billTab.deleteRow(i + 1);
        return jsonResponse({ success: true, message: 'Bill deleted.' });
      }
    }
    return jsonResponse({ success: false, error: 'Bill not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function updateEstimateStatus(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var billId = sanitize(params.billId);
    var status = sanitize(params.status);
    if (!['draft', 'sent', 'paid', 'cancelled'].indexOf(status)) return jsonResponse({ success: false, error: 'Invalid status.' });

    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === billId) {
        billTab.getRange(i + 1, 17).setValue(status);

        // Generate share token when sharing
        if (status === 'sent' && !data[i][17]) {
          var token = 'BTK_' + Utilities.getUuid().replace(/-/g, '');
          var planConfig = getUserPlanConfig(userId);
          var expiry = new Date(Date.now() + planConfig.shareLinkExpiryDays * 24 * 60 * 60 * 1000).toISOString();
          billTab.getRange(i + 1, 18).setValue(token);
          billTab.getRange(i + 1, 19).setValue(expiry);
          var shareUrl = ScriptApp.getService().getUrl() + '?page=portal&t=' + token;
          return jsonResponse({ success: true, message: 'Bill shared.', shareUrl: shareUrl });
        }

        return jsonResponse({ success: true, message: 'Status updated.' });
      }
    }
    return jsonResponse({ success: false, error: 'Bill not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function buildWhatsAppMessage(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var billId = sanitize(params.billId);
    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();
    var profileTab = getUserTab(userId, UTAB_PROFILE);

    var businessName = 'My Business';
    if (profileTab) {
      var pData = profileTab.getDataRange().getValues();
      for (var k = 1; k < pData.length; k++) {
        if (pData[k][0] === 'businessName' && pData[k][1]) { businessName = pData[k][1]; break; }
      }
    }

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === billId) {
        var items = [];
        try { items = JSON.parse(data[i][7]); } catch (e) {}

        var msg = '*Bill from ' + businessName + '*\n';
        msg += 'Bill No: ' + data[i][1] + '\n';
        msg += 'Date: ' + data[i][2] + '\n';
        msg += '──────────────\n';

        for (var j = 0; j < items.length; j++) {
          msg += items[j].name + ' x' + items[j].quantity + ' = ₹' + items[j].total + '\n';
        }

        msg += '──────────────\n';
        msg += 'Subtotal: ₹' + data[i][8] + '\n';
        if (parseFloat(data[i][11]) > 0) msg += 'CGST: ₹' + data[i][11] + '\n';
        if (parseFloat(data[i][12]) > 0) msg += 'SGST: ₹' + data[i][12] + '\n';
        if (parseFloat(data[i][13]) > 0) msg += 'IGST: ₹' + data[i][13] + '\n';
        msg += '*Total: ₹' + data[i][14] + '*\n';

        if (data[i][19]) msg += '\nWarranty: ' + (data[i][20] || 'As per policy') + '\n';
        msg += '\n_Generated by LumiBooks_';

        var phone = String(data[i][4]).replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = '91' + phone;

        return jsonResponse({
          success: true,
          message: msg,
          whatsappUrl: 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg)
        });
      }
    }
    return jsonResponse({ success: false, error: 'Bill not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}
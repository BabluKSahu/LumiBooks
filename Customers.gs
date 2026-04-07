/**
 * Customers.gs — LumiBooks v3
 * Customer CRM, payment records, statements, warranty claims.
 */

function addCustomer(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var custTab = getUserTab(userId, UTAB_CUSTOMERS);
    var existingCount = Math.max(0, custTab.getLastRow() - 1);
    var limitCheck = checkPlanLimit(userId, 'customers', existingCount);
    if (!limitCheck.ok) return jsonResponse({ success: false, error: 'Customer limit reached (' + limitCheck.limit + '). Upgrade your plan.' });

    var name = sanitize(params.name);
    var phone = sanitizePhone(params.phone);
    var email = sanitizeEmail(params.email);
    var gstIn = sanitizeGSTIN(params.gstIn);
    var address = sanitize(params.address) || '';
    var creditLimit = sanitizeNumber(params.creditLimit) || 0;

    if (!name) return jsonResponse({ success: false, error: 'Customer name is required.' });

    var customerId = 'CUS_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);
    custTab.appendRow([
      customerId, name, phone, email, gstIn, address, creditLimit,
      new Date().toISOString()
    ]);

    return jsonResponse({ success: true, customerId: customerId, message: 'Customer added.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getCustomers(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var custTab = getUserTab(userId, UTAB_CUSTOMERS);
    var data = custTab.getDataRange().getValues();
    var filter = params.filter || {};
    var customers = [];

    // Pre-load payment totals
    var payTab = getUserTab(userId, UTAB_CUST_PAYMENTS);
    var payData = payTab ? payTab.getDataRange().getValues() : [];
    var paymentTotals = {};
    for (var p = 1; p < payData.length; p++) {
      var cid = payData[p][1];
      if (!paymentTotals[cid]) paymentTotals[cid] = 0;
      paymentTotals[cid] += parseFloat(payData[p][3]) || 0;
    }

    // Pre-load bill totals
    var billTab = getUserTab(userId, UTAB_BILLS);
    var billData = billTab ? billTab.getDataRange().getValues() : [];
    var billTotals = {};
    for (var b = 1; b < billData.length; b++) {
      var cname = billData[b][3];
      if (!billTotals[cname]) billTotals[cname] = 0;
      if (billData[b][16] !== 'cancelled') billTotals[cname] += parseFloat(billData[b][14]) || 0;
    }

    for (var i = 1; i < data.length; i++) {
      var customer = {
        customerId: data[i][0], name: data[i][1], phone: data[i][2],
        email: data[i][3], gstIn: data[i][4], address: data[i][5],
        creditLimit: data[i][6], createdAt: data[i][7]
      };
      if (filter.search) {
        var s = filter.search.toLowerCase();
        if (customer.name.toLowerCase().indexOf(s) === -1 && customer.phone.indexOf(s) === -1) continue;
      }
      var billTotal = billTotals[customer.name] || 0;
      var paidTotal = paymentTotals[customer.customerId] || 0;
      customer.outstanding = Math.round((billTotal - paidTotal) * 100) / 100;
      customers.push(customer);
    }

    return jsonResponse({ success: true, customers: customers, total: customers.length });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function updateCustomer(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var customerId = sanitize(params.customerId);
    if (!customerId) return jsonResponse({ success: false, error: 'Customer ID required.' });

    var custTab = getUserTab(userId, UTAB_CUSTOMERS);
    var data = custTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === customerId) {
        var colMap = { name: 2, phone: 3, email: 4, gstIn: 5, address: 6, creditLimit: 7 };
        for (var key in colMap) {
          if (params[key] !== undefined) {
            var val = params[key];
            if (key === 'phone') val = sanitizePhone(val);
            if (key === 'email') val = sanitizeEmail(val);
            if (key === 'gstIn') val = sanitizeGSTIN(val);
            if (key === 'creditLimit') val = sanitizeNumber(val);
            else val = sanitize(val);
            custTab.getRange(i + 1, colMap[key]).setValue(val);
          }
        }
        return jsonResponse({ success: true, message: 'Customer updated.' });
      }
    }
    return jsonResponse({ success: false, error: 'Customer not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function deleteCustomer(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var customerId = sanitize(params.customerId);
    var custTab = getUserTab(userId, UTAB_CUSTOMERS);
    var data = custTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === customerId) {
        custTab.deleteRow(i + 1);
        return jsonResponse({ success: true, message: 'Customer deleted.' });
      }
    }
    return jsonResponse({ success: false, error: 'Customer not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getCustomerStatement(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var customerId = sanitize(params.customerId);
    var custTab = getUserTab(userId, UTAB_CUSTOMERS);
    var custData = custTab.getDataRange().getValues();
    var customer = null;
    for (var c = 1; c < custData.length; c++) {
      if (custData[c][0] === customerId) {
        customer = { name: custData[c][1], phone: custData[c][2] };
        break;
      }
    }
    if (!customer) return jsonResponse({ success: false, error: 'Customer not found.' });

    // Get bills for this customer
    var billTab = getUserTab(userId, UTAB_BILLS);
    var billData = billTab.getDataRange().getValues();
    var bills = [];
    var totalBilled = 0;
    for (var b = 1; b < billData.length; b++) {
      if (billData[b][3] === customer.name) {
        var amt = parseFloat(billData[b][14]) || 0;
        totalBilled += amt;
        bills.push({ billNumber: billData[b][1], date: billData[b][2], amount: amt, status: billData[b][16] });
      }
    }

    // Get payments for this customer
    var payTab = getUserTab(userId, UTAB_CUST_PAYMENTS);
    var payData = payTab.getDataRange().getValues();
    var payments = [];
    var totalPaid = 0;
    for (var p = 1; p < payData.length; p++) {
      if (payData[p][1] === customerId) {
        var pAmt = parseFloat(payData[p][3]) || 0;
        totalPaid += pAmt;
        payments.push({ date: payData[p][2], amount: pAmt, mode: payData[p][4], againstBill: payData[p][5] || '-', notes: payData[p][6] });
      }
    }

    return jsonResponse({
      success: true,
      customer: customer,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstanding: Math.round((totalBilled - totalPaid) * 100) / 100,
      bills: bills,
      payments: payments
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function addCustomerPayment(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var customerId = sanitize(params.customerId);
    var amount = sanitizeNumber(params.amount);
    var mode = sanitize(params.mode) || 'cash';
    var againstBillId = sanitize(params.againstBillId) || '';
    var notes = sanitize(params.notes) || '';
    var date = params.date || new Date().toISOString().split('T')[0];

    if (!customerId) return jsonResponse({ success: false, error: 'Customer is required.' });
    if (amount <= 0) return jsonResponse({ success: false, error: 'Amount must be greater than 0.' });
    if (!['cash', 'upi', 'bank', 'cheque'].indexOf(mode)) mode = 'cash';

    var payTab = getUserTab(userId, UTAB_CUST_PAYMENTS);
    payTab.appendRow([
      Utilities.getUuid(), customerId, date, amount, mode, againstBillId, notes,
      new Date().toISOString()
    ]);

    return jsonResponse({ success: true, message: 'Payment recorded.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getCustomerPayments(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var customerId = sanitize(params.customerId);
    var payTab = getUserTab(userId, UTAB_CUST_PAYMENTS);
    var data = payTab.getDataRange().getValues();
    var payments = [];
    var totalCollected = 0;

    for (var i = data.length - 1; i >= 1; i--) {
      if (customerId && data[i][1] !== customerId) continue;
      var amt = parseFloat(data[i][3]) || 0;
      totalCollected += amt;
      payments.push({
        paymentId: data[i][0], customerId: data[i][1], date: data[i][2],
        amount: amt, mode: data[i][4], againstBill: data[i][5], notes: data[i][6]
      });
    }

    return jsonResponse({ success: true, payments: payments, totalCollected: Math.round(totalCollected * 100) / 100 });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getWarrantyClaims(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var warrantyTab = getUserTab(userId, UTAB_WARRANTY);
    if (!warrantyTab) return jsonResponse({ success: true, claims: [] });

    var data = warrantyTab.getDataRange().getValues();
    var filter = params.filter || {};
    var claims = [];

    for (var i = data.length - 1; i >= 1; i--) {
      var claim = {
        claimId: data[i][0], billId: data[i][1], billNumber: data[i][2],
        customerName: data[i][3], customerPhone: data[i][4],
        issueDescription: data[i][5], status: data[i][6],
        adminNotes: data[i][7], createdAt: data[i][8]
      };
      if (filter.status && claim.status !== filter.status) continue;
      claims.push(claim);
    }

    return jsonResponse({ success: true, claims: claims, total: claims.length });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}
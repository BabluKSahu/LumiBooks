/**
 * Transactions.gs — LumiBooks v3
 * Transaction CRUD, dashboard summary, global search, custom categories.
 */

function addTransaction(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var type = sanitize(params.type); // credit or debit
    var category = sanitize(params.category);
    var description = sanitize(params.description);
    var amount = sanitizeNumber(params.amount);
    var gstRate = sanitizeNumber(params.gstRate) || 0;
    var date = params.date || new Date().toISOString().split('T')[0];

    if (type !== 'credit' && type !== 'debit') return jsonResponse({ success: false, error: 'Type must be credit or debit.' });
    if (!category) return jsonResponse({ success: false, error: 'Category is required.' });
    if (amount <= 0) return jsonResponse({ success: false, error: 'Amount must be greater than 0.' });

    // Check monthly limit
    var txnTab = requireUserTab(userId, UTAB_TRANSACTIONS);
    var data = txnTab.getDataRange().getValues();
    var now = new Date();
    var monthTxnCount = 0;
    for (var i = 1; i < data.length; i++) {
      var txnDate = new Date(data[i][1]);
      if (txnDate.getMonth() === now.getMonth() && txnDate.getFullYear() === now.getFullYear()) {
        monthTxnCount++;
      }
    }
    var limitCheck = checkPlanLimit(userId, 'transactionsPerMonth', monthTxnCount);
    if (!limitCheck.ok) return jsonResponse({ success: false, error: 'You have reached your monthly transaction limit (' + limitCheck.limit + '). Upgrade your plan for more.' });

    // Calculate GST
    var gstAmount = (amount * gstRate) / 100;
    var totalAmount = type === 'credit' ? amount + gstAmount : amount + gstAmount;

    var txnId = 'TXN_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);
    txnTab.appendRow([
      txnId, date, type, category, description, amount, gstRate, gstAmount, totalAmount,
      new Date().toISOString()
    ]);

    return jsonResponse({ success: true, txnId: txnId, message: 'Transaction added successfully.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

function getTransactions(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var txnTab = requireUserTab(userId, UTAB_TRANSACTIONS);
    var data = txnTab.getDataRange().getValues();
    var filter = params.filter || {};
    var transactions = [];
    var planConfig = getUserPlanConfig(userId);
    var historyDays = planConfig.reportHistoryDays;
    var cutoffDate = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000);

    for (var i = data.length - 1; i >= 1; i--) {
      var txn = {
        txnId: data[i][0], date: data[i][1], type: data[i][2],
        category: data[i][3], description: data[i][4], amount: data[i][5],
        gstRate: data[i][6], gstAmount: data[i][7], totalAmount: data[i][8],
        createdAt: data[i][9]
      };

      // Date filter
      var txnDate = new Date(txn.date);
      if (txnDate < cutoffDate) continue;

      // Type filter
      if (filter.type && txn.type !== filter.type) continue;
      // Category filter
      if (filter.category && txn.category !== filter.category) continue;
      // Search filter
      if (filter.search) {
        var s = filter.search.toLowerCase();
        if (txn.description.toLowerCase().indexOf(s) === -1 &&
            txn.category.toLowerCase().indexOf(s) === -1) continue;
      }
      // Date range filter
      if (filter.fromDate && txnDate < new Date(filter.fromDate)) continue;
      if (filter.toDate && txnDate > new Date(filter.toDate)) continue;

      transactions.push(txn);
    }

    return jsonResponse({ success: true, transactions: transactions, total: transactions.length });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function updateTransaction(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var txnId = sanitize(params.txnId);
    if (!txnId) return jsonResponse({ success: false, error: 'Transaction ID is required.' });
    
    var txnTab = requireUserTab(userId, UTAB_TRANSACTIONS);
    var data = txnTab.getDataRange().getValues();
    var row = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === txnId) { row = i; break; }
    }
    if (row === -1) return jsonResponse({ success: false, error: 'Transaction not found.' });

    var updates = {};
    var allowed = ['category', 'description', 'amount', 'gstRate', 'date'];
    for (var key in params) {
      if (allowed.indexOf(key) !== -1) updates[key] = params[key];
    }

    if (updates.amount) {
      updates.amount = sanitizeNumber(updates.amount);
      var gstRate = sanitizeNumber(updates.gstRate) || parseFloat(data[row][6]) || 0;
      updates.gstAmount = (updates.amount * gstRate) / 100;
      updates.totalAmount = updates.amount + updates.gstAmount;
    }

    // Map keys to column indices (1-based)
    var colMap = { category: 4, description: 5, amount: 6, gstRate: 7, date: 2 };
    for (var col in colMap) {
      if (updates[col] !== undefined) {
        txnTab.getRange(row + 1, colMap[col]).setValue(updates[col]);
      }
    }
    if (updates.gstAmount !== undefined) txnTab.getRange(row + 1, 8).setValue(updates.gstAmount);
    if (updates.totalAmount !== undefined) txnTab.getRange(row + 1, 9).setValue(updates.totalAmount);

    return jsonResponse({ success: true, message: 'Transaction updated.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function deleteTransaction(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var txnId = sanitize(params.txnId);
    var txnTab = requireUserTab(userId, UTAB_TRANSACTIONS);
    var data = txnTab.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === txnId) {
        txnTab.deleteRow(i + 1);
        return jsonResponse({ success: true, message: 'Transaction deleted.' });
      }
    }

    return jsonResponse({ success: false, error: 'Transaction not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// DASHBOARD SUMMARY
// ═══════════════════════════════════════
function getDashboardSummary(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var txnTab = requireUserTab(userId, UTAB_TRANSACTIONS);
    var data = txnTab.getDataRange().getValues();
    var now = new Date();
    var prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    var thisMonthIncome = 0, thisMonthExpense = 0;
    var prevMonthIncome = 0, prevMonthExpense = 0;
    var recentTxns = [];
    var totalIncome = 0, totalExpense = 0;

    for (var i = data.length - 1; i >= 1; i--) {
      var date = new Date(data[i][1]);
      var amount = parseFloat(data[i][8]) || 0;
      var type = data[i][2];

      if (type === 'credit') {
        totalIncome += amount;
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) thisMonthIncome += amount;
        if (date.getMonth() === prevMonth.getMonth() && date.getFullYear() === prevMonth.getFullYear()) prevMonthIncome += amount;
      } else {
        totalExpense += amount;
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) thisMonthExpense += amount;
        if (date.getMonth() === prevMonth.getMonth() && date.getFullYear() === prevMonth.getFullYear()) prevMonthExpense += amount;
      }

      if (recentTxns.length < 5) {
        recentTxns.push({
          txnId: data[i][0], date: data[i][1], type: data[i][2],
          category: data[i][3], description: data[i][4], totalAmount: amount
        });
      }
    }

    // Low stock alerts
    var stockTab = getUserTab(userId, UTAB_STOCK);
    var lowStock = [];
    if (stockTab) {
      var sData = stockTab.getDataRange().getValues();
      for (var j = 1; j < sData.length; j++) {
        var qty = parseFloat(sData[j][7]) || 0;
        var reorder = parseFloat(sData[j][8]) || 0;
        if (qty <= reorder && reorder > 0) {
          lowStock.push({ name: sData[j][2], current: qty, reorder: reorder });
        }
        if (lowStock.length >= 5) break;
      }
    }

    // Bill count
    var billTab = getUserTab(userId, UTAB_BILLS);
    var billCount = billTab ? Math.max(0, billTab.getLastRow() - 1) : 0;

    // Customer count
    var custTab = getUserTab(userId, UTAB_CUSTOMERS);
    var custCount = custTab ? Math.max(0, custTab.getLastRow() - 1) : 0;

    var incomeChange = prevMonthIncome > 0 ? Math.round(((thisMonthIncome - prevMonthIncome) / prevMonthIncome) * 100) : 0;
    var expenseChange = prevMonthExpense > 0 ? Math.round(((thisMonthExpense - prevMonthExpense) / prevMonthExpense) * 100) : 0;

    return jsonResponse({
      success: true,
      thisMonthIncome: thisMonthIncome,
      thisMonthExpense: thisMonthExpense,
      thisMonthProfit: thisMonthIncome - thisMonthExpense,
      prevMonthIncome: prevMonthIncome,
      prevMonthExpense: prevMonthExpense,
      incomeChange: incomeChange,
      expenseChange: expenseChange,
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      recentTransactions: recentTxns,
      lowStockAlerts: lowStock,
      billCount: billCount,
      customerCount: custCount
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// GLOBAL SEARCH
// ═══════════════════════════════════════
function globalSearch(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var query = (params.query || '').toLowerCase().trim();
    if (!query || query.length < 2) return jsonResponse({ success: true, results: { transactions: [], bills: [], customers: [], stock: [] } });

    var results = { transactions: [], bills: [], customers: [], stock: [] };

    // Search transactions
    var txnTab = requireUserTab(userId, UTAB_TRANSACTIONS);
    if (txnTab) {
      var tData = txnTab.getDataRange().getValues();
      for (var i = tData.length - 1; i >= 1; i--) {
        if (String(tData[i][3]).toLowerCase().indexOf(query) !== -1 ||
            String(tData[i][4]).toLowerCase().indexOf(query) !== -1) {
          results.transactions.push({ txnId: tData[i][0], date: tData[i][1], type: tData[i][2], category: tData[i][3], description: tData[i][4], totalAmount: tData[i][8] });
          if (results.transactions.length >= 5) break;
        }
      }
    }

    // Search bills
    var billTab = getUserTab(userId, UTAB_BILLS);
    if (billTab) {
      var bData = billTab.getDataRange().getValues();
      for (var j = bData.length - 1; j >= 1; j--) {
        if (String(bData[j][3]).toLowerCase().indexOf(query) !== -1 ||
            String(bData[j][2]).toLowerCase().indexOf(query) !== -1 ||
            String(bData[j][10]).toLowerCase().indexOf(query) !== -1) {
          results.bills.push({ billId: bData[j][0], billNumber: bData[j][1], date: bData[j][2], customerName: bData[j][3], totalAmount: bData[j][14], status: bData[j][17] });
          if (results.bills.length >= 5) break;
        }
      }
    }

    // Search customers
    var custTab = getUserTab(userId, UTAB_CUSTOMERS);
    if (custTab) {
      var cData = custTab.getDataRange().getValues();
      for (var k = 1; k < cData.length; k++) {
        if (String(cData[k][1]).toLowerCase().indexOf(query) !== -1 ||
            String(cData[k][2]).toLowerCase().indexOf(query) !== -1 ||
            String(cData[k][4]).toLowerCase().indexOf(query) !== -1) {
          results.customers.push({ customerId: cData[k][0], name: cData[k][1], phone: cData[k][2], email: cData[k][3], gstIn: cData[k][4] });
          if (results.customers.length >= 5) break;
        }
      }
    }

    // Search stock
    var stockTab = getUserTab(userId, UTAB_STOCK);
    if (stockTab) {
      var sData = stockTab.getDataRange().getValues();
      for (var l = 1; l < sData.length; l++) {
        if (String(sData[l][1]).toLowerCase().indexOf(query) !== -1 ||
            String(sData[l][2]).toLowerCase().indexOf(query) !== -1 ||
            String(sData[l][3]).toLowerCase().indexOf(query) !== -1) {
          results.stock.push({ itemId: sData[l][0], sku: sData[l][1], name: sData[l][2], category: sData[l][3], currentQty: sData[l][7] });
          if (results.stock.length >= 5) break;
        }
      }
    }

    return jsonResponse({ success: true, results: results });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════
function getCategories(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var catTab = getUserTab(userId, UTAB_CATEGORIES);
    var data = catTab.getDataRange().getValues();
    var categories = [];
    for (var i = 1; i < data.length; i++) {
      categories.push({
        categoryId: data[i][0], name: data[i][1], type: data[i][2],
        icon: data[i][3], color: data[i][4], isDefault: data[i][6] === true
      });
    }
    return jsonResponse({ success: true, categories: categories });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function addCategory(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var name = sanitize(params.name);
    var type = sanitize(params.type);
    var icon = sanitize(params.icon) || 'label';
    var color = sanitize(params.color) || '#666666';

    if (!name) return jsonResponse({ success: false, error: 'Category name is required.' });
    if (type !== 'income' && type !== 'expense') return jsonResponse({ success: false, error: 'Type must be income or expense.' });

    var catTab = getUserTab(userId, UTAB_CATEGORIES);
    var data = catTab.getDataRange().getValues();
    var customCount = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][6] !== true) customCount++;
    }
    var limitCheck = checkPlanLimit(userId, 'customCategories', customCount);
    if (!limitCheck.ok) return jsonResponse({ success: false, error: 'Custom category limit reached (' + limitCheck.limit + '). Upgrade your plan for more.' });

    catTab.appendRow([Utilities.getUuid(), name, type, icon, color, new Date().toISOString(), false]);
    return jsonResponse({ success: true, message: 'Category added.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function updateCategory(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var catId = sanitize(params.categoryId);
    if (!catId) return jsonResponse({ success: false, error: 'Category ID required.' });

    var catTab = getUserTab(userId, UTAB_CATEGORIES);
    var data = catTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === catId) {
        if (data[i][6] === true) return jsonResponse({ success: false, error: 'Default categories cannot be modified.' });
        if (params.name) catTab.getRange(i + 1, 2).setValue(sanitize(params.name));
        if (params.icon) catTab.getRange(i + 1, 4).setValue(sanitize(params.icon));
        if (params.color) catTab.getRange(i + 1, 5).setValue(sanitize(params.color));
        return jsonResponse({ success: true, message: 'Category updated.' });
      }
    }
    return jsonResponse({ success: false, error: 'Category not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function deleteCategory(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var catId = sanitize(params.categoryId);
    var catTab = getUserTab(userId, UTAB_CATEGORIES);
    var data = catTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === catId) {
        if (data[i][6] === true) return jsonResponse({ success: false, error: 'Default categories cannot be deleted.' });
        catTab.deleteRow(i + 1);
        return jsonResponse({ success: true, message: 'Category deleted.' });
      }
    }
    return jsonResponse({ success: false, error: 'Category not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}
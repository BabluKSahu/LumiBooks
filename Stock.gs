/**
 * Stock.gs — LumiBooks v3
 * Inventory CRUD, stock adjustment, low stock alerts, stock report.
 */

function addStockItem(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var stockTab = getUserTab(userId, UTAB_STOCK);
    var existingCount = Math.max(0, stockTab.getLastRow() - 1);
    var limitCheck = checkPlanLimit(userId, 'stockItems', existingCount);
    if (!limitCheck.ok) return jsonResponse({ success: false, error: 'Stock item limit reached (' + limitCheck.limit + '). Upgrade your plan.' });

    var sku = sanitize(params.sku);
    var name = sanitize(params.name);
    var category = sanitize(params.category);
    var unit = sanitize(params.unit) || 'pcs';
    var costPrice = sanitizeNumber(params.costPrice);
    var sellPrice = sanitizeNumber(params.sellPrice);
    var currentQty = sanitizeNumber(params.currentQty) || 0;
    var reorderLevel = sanitizeNumber(params.reorderLevel) || 0;
    var location = sanitize(params.location) || '';

    if (!name) return jsonResponse({ success: false, error: 'Item name is required.' });
    if (sellPrice <= 0) return jsonResponse({ success: false, error: 'Sell price must be greater than 0.' });

    // Check duplicate SKU
    if (sku) {
      var data = stockTab.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase() === sku.toLowerCase()) {
          return jsonResponse({ success: false, error: 'SKU already exists.' });
        }
      }
    }

    var itemId = 'STK_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);
    stockTab.appendRow([
      itemId, sku, name, category, unit, costPrice, sellPrice,
      currentQty, reorderLevel, location, new Date().toISOString()
    ]);

    return jsonResponse({ success: true, itemId: itemId, message: 'Stock item added.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getStockItems(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var stockTab = getUserTab(userId, UTAB_STOCK);
    var data = stockTab.getDataRange().getValues();
    var filter = params.filter || {};
    var items = [];

    for (var i = 1; i < data.length; i++) {
      var item = {
        itemId: data[i][0], sku: data[i][1], name: data[i][2],
        category: data[i][3], unit: data[i][4], costPrice: data[i][5],
        sellPrice: data[i][6], currentQty: data[i][7], reorderLevel: data[i][8],
        location: data[i][9], createdAt: data[i][10]
      };
      if (filter.category && item.category !== filter.category) continue;
      if (filter.search) {
        var s = filter.search.toLowerCase();
        if (item.name.toLowerCase().indexOf(s) === -1 && item.sku.toLowerCase().indexOf(s) === -1) continue;
      }
      items.push(item);
    }

    return jsonResponse({ success: true, items: items, total: items.length });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function updateStockItem(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var itemId = sanitize(params.itemId);
    if (!itemId) return jsonResponse({ success: false, error: 'Item ID required.' });

    var stockTab = getUserTab(userId, UTAB_STOCK);
    var data = stockTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        var allowed = { sku: 2, name: 3, category: 4, unit: 5, costPrice: 6, sellPrice: 7, reorderLevel: 9, location: 10 };
        for (var key in allowed) {
          if (params[key] !== undefined) {
            var val = params[key];
            if (['costPrice', 'sellPrice', 'reorderLevel'].indexOf(key) !== -1) val = sanitizeNumber(val);
            else val = sanitize(val);
            stockTab.getRange(i + 1, allowed[key]).setValue(val);
          }
        }
        return jsonResponse({ success: true, message: 'Stock item updated.' });
      }
    }
    return jsonResponse({ success: false, error: 'Item not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function deleteStockItem(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var itemId = sanitize(params.itemId);
    var stockTab = getUserTab(userId, UTAB_STOCK);
    var data = stockTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        stockTab.deleteRow(i + 1);
        return jsonResponse({ success: true, message: 'Stock item deleted.' });
      }
    }
    return jsonResponse({ success: false, error: 'Item not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function adjustStock(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var itemId = sanitize(params.itemId);
    var adjustment = sanitizeNumber(params.adjustment); // positive = add, negative = remove
    var reason = sanitize(params.reason) || '';

    if (!itemId) return jsonResponse({ success: false, error: 'Item ID required.' });
    if (adjustment === 0) return jsonResponse({ success: false, error: 'Adjustment cannot be zero.' });

    var stockTab = getUserTab(userId, UTAB_STOCK);
    var data = stockTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        var currentQty = parseFloat(data[i][7]) || 0;
        var newQty = currentQty + adjustment;
        if (newQty < 0) return jsonResponse({ success: false, error: 'Cannot reduce stock below zero.' });
        stockTab.getRange(i + 1, 8).setValue(newQty);
        return jsonResponse({ success: true, message: 'Stock adjusted. New quantity: ' + newQty, newQty: newQty });
      }
    }
    return jsonResponse({ success: false, error: 'Item not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getLowStockItems(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var stockTab = getUserTab(userId, UTAB_STOCK);
    var data = stockTab.getDataRange().getValues();
    var lowItems = [];

    for (var i = 1; i < data.length; i++) {
      var qty = parseFloat(data[i][7]) || 0;
      var reorder = parseFloat(data[i][8]) || 0;
      if (reorder > 0 && qty <= reorder) {
        lowItems.push({
          itemId: data[i][0], sku: data[i][1], name: data[i][2],
          category: data[i][3], currentQty: qty, reorderLevel: reorder
        });
      }
    }

    return jsonResponse({ success: true, items: lowItems, total: lowItems.length });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getStockReportData(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var stockTab = getUserTab(userId, UTAB_STOCK);
    var data = stockTab.getDataRange().getValues();
    var totalItems = data.length - 1;
    var totalValue = 0;
    var categoryBreakdown = {};
    var lowStockCount = 0;

    for (var i = 1; i < data.length; i++) {
      var qty = parseFloat(data[i][7]) || 0;
      var cost = parseFloat(data[i][5]) || 0;
      totalValue += qty * cost;
      var cat = data[i][3] || 'Uncategorized';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, value: 0 };
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].value += qty * cost;
      var reorder = parseFloat(data[i][8]) || 0;
      if (reorder > 0 && qty <= reorder) lowStockCount++;
    }

    return jsonResponse({
      success: true,
      totalItems: totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockCount: lowStockCount,
      categoryBreakdown: categoryBreakdown
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}
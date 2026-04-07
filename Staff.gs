/**
 * Staff.gs — LumiBooks v3
 * Staff profiles, attendance, salary/advance payments, HR reports.
 */

function addStaff(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffTab = getUserTab(userId, UTAB_STAFF);
    var existingCount = Math.max(0, staffTab.getLastRow() - 1);
    var limitCheck = checkPlanLimit(userId, 'staffMembers', existingCount);
    if (!limitCheck.ok) return jsonResponse({ success: false, error: 'Staff limit reached (' + limitCheck.limit + '). Upgrade your plan.' });

    var name = sanitize(params.name);
    var role = sanitize(params.role) || '';
    var department = sanitize(params.department) || '';
    var salaryType = sanitize(params.salaryType) || 'monthly';
    var salaryAmount = sanitizeNumber(params.salaryAmount) || 0;
    var bankAccount = sanitize(params.bankAccount) || '';
    var bankName = sanitize(params.bankName) || '';
    var ifsc = sanitize(params.ifsc) || '';

    if (!name) return jsonResponse({ success: false, error: 'Staff name is required.' });
    if (!['monthly', 'daily', 'weekly'].indexOf(salaryType)) salaryType = 'monthly';

    var staffId = 'STF_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);
    staffTab.appendRow([
      staffId, name, role, department, salaryType, salaryAmount,
      bankAccount, bankName, ifsc, 'active', new Date().toISOString()
    ]);

    return jsonResponse({ success: true, staffId: staffId, message: 'Staff member added.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getStaff(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffTab = getUserTab(userId, UTAB_STAFF);
    var data = staffTab.getDataRange().getValues();
    var filter = params.filter || {};
    var staffList = [];

    for (var i = 1; i < data.length; i++) {
      var s = {
        staffId: data[i][0], name: data[i][1], role: data[i][2],
        department: data[i][3], salaryType: data[i][4], salaryAmount: data[i][5],
        bankAccount: data[i][6], bankName: data[i][7], ifsc: data[i][8],
        status: data[i][9], createdAt: data[i][10]
      };
      if (filter.status && s.status !== filter.status) continue;
      if (filter.department && s.department !== filter.department) continue;
      if (filter.search) {
        var q = filter.search.toLowerCase();
        if (s.name.toLowerCase().indexOf(q) === -1 && s.role.toLowerCase().indexOf(q) === -1) continue;
      }
      staffList.push(s);
    }

    return jsonResponse({ success: true, staff: staffList, total: staffList.length });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function updateStaff(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffId = sanitize(params.staffId);
    if (!staffId) return jsonResponse({ success: false, error: 'Staff ID required.' });

    var staffTab = getUserTab(userId, UTAB_STAFF);
    var data = staffTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === staffId) {
        var colMap = { name: 2, role: 3, department: 4, salaryType: 5, salaryAmount: 6, bankAccount: 7, bankName: 8, ifsc: 9, status: 10 };
        for (var key in colMap) {
          if (params[key] !== undefined) {
            var val = params[key];
            if (key === 'salaryAmount') val = sanitizeNumber(val);
            else val = sanitize(val);
            staffTab.getRange(i + 1, colMap[key]).setValue(val);
          }
        }
        return jsonResponse({ success: true, message: 'Staff updated.' });
      }
    }
    return jsonResponse({ success: false, error: 'Staff not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function deleteStaff(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffId = sanitize(params.staffId);
    var staffTab = getUserTab(userId, UTAB_STAFF);
    var data = staffTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === staffId) {
        staffTab.deleteRow(i + 1);
        return jsonResponse({ success: true, message: 'Staff deleted.' });
      }
    }
    return jsonResponse({ success: false, error: 'Staff not found.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════
function markAttendance(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffId = sanitize(params.staffId);
    var date = params.date || new Date().toISOString().split('T')[0];
    var status = sanitize(params.status) || 'present';
    var checkIn = sanitize(params.checkIn) || '';
    var checkOut = sanitize(params.checkOut) || '';

    if (!staffId) return jsonResponse({ success: false, error: 'Staff ID required.' });
    if (!['present', 'absent', 'leave'].indexOf(status)) status = 'present';

    // Check for existing record
    var attTab = getUserTab(userId, UTAB_ATTENDANCE);
    var data = attTab.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === staffId && String(data[i][2]) === String(date)) {
        attTab.getRange(i + 1, 4).setValue(status);
        if (checkIn) attTab.getRange(i + 1, 5).setValue(checkIn);
        if (checkOut) attTab.getRange(i + 1, 6).setValue(checkOut);
        return jsonResponse({ success: true, message: 'Attendance updated.' });
      }
    }

    attTab.appendRow([
      Utilities.getUuid(), staffId, date, status, checkIn, checkOut,
      new Date().toISOString()
    ]);

    return jsonResponse({ success: true, message: 'Attendance marked.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getAttendance(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffId = sanitize(params.staffId);
    var month = parseInt(params.month);
    var year = parseInt(params.year);
    if (isNaN(month) || isNaN(year)) {
      var now = new Date(); month = now.getMonth() + 1; year = now.getFullYear();
    }

    var attTab = getUserTab(userId, UTAB_ATTENDANCE);
    var data = attTab.getDataRange().getValues();
    var records = [];
    var presentDays = 0, absentDays = 0, leaveDays = 0;

    for (var i = 1; i < data.length; i++) {
      if (staffId && data[i][1] !== staffId) continue;
      var d = new Date(data[i][2]);
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        var st = data[i][4];
        if (st === 'present') presentDays++;
        else if (st === 'absent') absentDays++;
        else if (st === 'leave') leaveDays++;
        records.push({
          attendanceId: data[i][0], staffId: data[i][1], date: data[i][2],
          status: st, checkIn: data[i][5], checkOut: data[i][6]
        });
      }
    }

    return jsonResponse({
      success: true, records: records,
      summary: { present: presentDays, absent: absentDays, leave: leaveDays, total: presentDays + absentDays + leaveDays }
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// STAFF PAYMENTS
// ═══════════════════════════════════════
function addStaffPayment(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffId = sanitize(params.staffId);
    var month = parseInt(params.month) || new Date().getMonth() + 1;
    var year = parseInt(params.year) || new Date().getFullYear();
    var amount = sanitizeNumber(params.amount);
    var type = sanitize(params.type) || 'salary';
    var mode = sanitize(params.mode) || 'cash';
    var notes = sanitize(params.notes) || '';

    if (!staffId) return jsonResponse({ success: false, error: 'Staff ID required.' });
    if (amount <= 0) return jsonResponse({ success: false, error: 'Amount must be greater than 0.' });
    if (!['salary', 'advance', 'bonus'].indexOf(type)) type = 'salary';

    var payTab = getUserTab(userId, UTAB_STAFF_PAYMENTS);
    payTab.appendRow([
      Utilities.getUuid(), staffId, month, year, amount, type, mode, notes,
      new Date().toISOString()
    ]);

    return jsonResponse({ success: true, message: 'Staff payment recorded.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getStaffPayments(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffId = sanitize(params.staffId);
    var payTab = getUserTab(userId, UTAB_STAFF_PAYMENTS);
    var data = payTab.getDataRange().getValues();
    var payments = [];
    var totalPaid = 0;
    var totalAdvance = 0;

    for (var i = data.length - 1; i >= 1; i--) {
      if (staffId && data[i][1] !== staffId) continue;
      var amt = parseFloat(data[i][4]) || 0;
      if (data[i][5] === 'advance') totalAdvance += amt;
      else totalPaid += amt;
      payments.push({
        paymentId: data[i][0], staffId: data[i][1], month: data[i][2],
        year: data[i][3], amount: amt, type: data[i][5], mode: data[i][6],
        notes: data[i][7]
      });
    }

    return jsonResponse({
      success: true, payments: payments,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalAdvance: Math.round(totalAdvance * 100) / 100
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function getStaffReportData(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var staffTab = getUserTab(userId, UTAB_STAFF);
    var attTab = getUserTab(userId, UTAB_ATTENDANCE);
    var payTab = getUserTab(userId, UTAB_STAFF_PAYMENTS);

    var sData = staffTab.getDataRange().getValues();
    var aData = attTab ? attTab.getDataRange().getValues() : [];
    var pData = payTab ? payTab.getDataRange().getValues() : [];
    var now = new Date();
    var curMonth = now.getMonth() + 1;
    var curYear = now.getFullYear();

    var report = [];
    for (var i = 1; i < sData.length; i++) {
      var sId = sData[i][0];
      var present = 0, salaryPaid = 0, advanceTotal = 0;

      for (var a = 1; a < aData.length; a++) {
        if (aData[a][1] === sId) {
          var ad = new Date(aData[a][2]);
          if (ad.getMonth() + 1 === curMonth && ad.getFullYear() === curYear && aData[a][4] === 'present') present++;
        }
      }

      for (var p = 1; p < pData.length; p++) {
        if (pData[p][1] === sId && pData[p][2] === curMonth && pData[p][3] === curYear) {
          if (pData[p][5] === 'advance') advanceTotal += parseFloat(pData[p][4]) || 0;
          else salaryPaid += parseFloat(pData[p][4]) || 0;
        }
      }

      report.push({
        staffId: sId, name: sData[i][1], role: sData[i][2],
        department: sData[i][3], salaryAmount: sData[i][5],
        daysPresent: present, salaryPaid: salaryPaid, advanceBalance: advanceTotal
      });
    }

    return jsonResponse({ success: true, report: report, month: curMonth, year: curYear });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}
/**
 * Config.gs — LumiBooks v3
 * All constants, plan limits, security utilities, storage helpers.
 * TRADE SECRET: Never expose these values or this file name in any user-facing surface.
 */

// ═══════════════════════════════════════
// MASTER STORAGE — Google Drive Folder ID
// Replace with your actual Google Drive folder ID
// ═══════════════════════════════════════
var MASTER_FOLDER_ID = '1E4KzKMJZdGIUGYDQurmdgt_DzxueNGsT';
var MASTER_SHEET_ID = '1FUin3Onr9OvQGU-Hc4ROfQKPP-H1sx8K-MCvmE3unHA';

// ═══════════════════════════════════════
// PLAN CONFIGURATION
// ═══════════════════════════════════════
var PLANS = {
  free: {
    name: 'Free',
    price: 0,
    transactionsPerMonth: 200,
    totalBills: 20,
    stockItems: 5,
    customers: 15,
    staffMembers: 3,
    templates: ['classic', 'modern-dark'],
    reportHistoryDays: 30,
    customCategories: 3,
    billEditWindowHours: 1,
    shareLinkExpiryDays: 90,
    hasGST: false,
    hasPDF: false,
    hasWarranty: false,
    hasCustomFields: false,
    hasCSVExport: false,
    hasCustomerPrint: false
  },
  standard: {
    name: 'Standard',
    price: 199,
    transactionsPerMonth: 500,
    totalBills: 50,
    stockItems: 50,
    customers: 50,
    staffMembers: 10,
    templates: ['classic', 'modern-dark', 'gst-standard', 'professional'],
    reportHistoryDays: 180,
    customCategories: 15,
    billEditWindowHours: 6,
    shareLinkExpiryDays: 180,
    hasGST: true,
    hasPDF: false,
    hasWarranty: false,
    hasCustomFields: false,
    hasCSVExport: false,
    hasCustomerPrint: true
  },
  premium: {
    name: 'Premium',
    price: 399,
    transactionsPerMonth: 1500,
    totalBills: Infinity,
    stockItems: Infinity,
    customers: Infinity,
    staffMembers: Infinity,
    templates: ['classic', 'modern-dark', 'gst-standard', 'professional', 'executive', 'gst-premium'],
    reportHistoryDays: 365,
    customCategories: Infinity,
    billEditWindowHours: 24,
    shareLinkExpiryDays: 365,
    hasGST: true,
    hasPDF: true,
    hasWarranty: true,
    hasCustomFields: true,
    hasCSVExport: true,
    hasCustomerPrint: true
  },
  enterprise: {
    name: 'Enterprise',
    price: 0,
    transactionsPerMonth: Infinity,
    totalBills: Infinity,
    stockItems: Infinity,
    customers: Infinity,
    staffMembers: Infinity,
    templates: ['classic', 'modern-dark', 'gst-standard', 'professional', 'executive', 'gst-premium', 'enterprise-custom'],
    reportHistoryDays: 1095,
    customCategories: Infinity,
    billEditWindowHours: 72,
    shareLinkExpiryDays: 730,
    hasGST: true,
    hasPDF: true,
    hasWarranty: true,
    hasCustomFields: true,
    hasCSVExport: true,
    hasCustomerPrint: true
  }
};


// ═══════════════════════════════════════
// SECURITY CONSTANTS
// ═══════════════════════════════════════
var SESSION_EXPIRY_USER_MS = 24 * 60 * 60 * 1000;      // 24 hours
var SESSION_EXPIRY_ADMIN_MS = 8 * 60 * 60 * 1000;      // 8 hours
var RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;             // 15 minutes
var MAX_RESET_REQUESTS_PER_HOUR = 3;
var ASSISTANT_RATE_LIMIT = 30;                           // per hour per user
var BACKUP_MAX_PER_USER = 10;
var BACKUP_COOLDOWN_MS = 24 * 60 * 60 * 1000;           // 24 hours
var ADMIN_SECRET_PARAM = '_lb_admin_secure';             // Never expose this

// ═══════════════════════════════════════
// UPI CONFIGURATION
// ═══════════════════════════════════════
var UPI_ID = 'lumineerco@ibl';
var UPI_PAYEE_NAME = 'LumiBooks';

// ═══════════════════════════════════════
// TAB NAMES (Master Sheet)
// ═══════════════════════════════════════
var TAB_USERS = 'Users';
var TAB_SESSIONS = 'Sessions';
var TAB_PAYMENTS = 'Payments';
var TAB_REFERRALS = 'Referrals';
var TAB_CONTACTS = 'ContactForms';
var TAB_TICKETS = 'Tickets';
var TAB_AUDIT = 'AuditLog';
var TAB_EVENTS = 'EventLog';
var TAB_BROADCASTS = 'Broadcasts';
var TAB_SETTINGS = 'AppSettings';

// ═══════════════════════════════════════
// TAB NAMES (User Sheet)
// ═══════════════════════════════════════
var UTAB_PROFILE = 'Profile';
var UTAB_TRANSACTIONS = 'Transactions';
var UTAB_BILLS = 'Bills';
var UTAB_STOCK = 'Stock';
var UTAB_CUSTOMERS = 'Customers';
var UTAB_CUST_PAYMENTS = 'CustPayments';
var UTAB_STAFF = 'Staff';
var UTAB_ATTENDANCE = 'Attendance';
var UTAB_STAFF_PAYMENTS = 'StaffPayments';
var UTAB_CATEGORIES = 'Categories';
var UTAB_CUSTOM_FIELDS = 'CustomFields';
var UTAB_WARRANTY = 'WarrantyClaims';

// ═══════════════════════════════════════
// DEFAULT CATEGORIES
// ═══════════════════════════════════════
var DEFAULT_CATEGORIES = [
  { name: 'Sales', type: 'income', icon: 'shopping_bag', color: '#1D9E75' },
  { name: 'Service Income', type: 'income', icon: 'wrench', color: '#1D9E75' },
  { name: 'Other Income', type: 'income', icon: 'trending_up', color: '#1D9E75' },
  { name: 'Purchases', type: 'expense', icon: 'cart', color: '#D4537E' },
  { name: 'Rent', type: 'expense', icon: 'home', color: '#D4537E' },
  { name: 'Salaries', type: 'expense', icon: 'people', color: '#D4537E' },
  { name: 'Utilities', type: 'expense', icon: 'bolt', color: '#D4537E' },
  { name: 'Transport', type: 'expense', icon: 'local_shipping', color: '#D4537E' },
  { name: 'Miscellaneous', type: 'expense', icon: 'more_horiz', color: '#D4537E' }
];

// ═══════════════════════════════════════
// SECURITY UTILITY FUNCTIONS
// ═══════════════════════════════════════

/**
 * Generate a cryptographic salt (32 hex chars)
 */
function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 32);
}

/**
 * SHA-256 hash with salt
 */
function hashPassword(password, salt) {
  var combined = password + salt;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined);
  return bytes.map(function(b) {
    return ('0' + ((b < 0) ? (b + 256) : b).toString(16)).slice(-2);
  }).join('');
}

/**
 * Hash any string with SHA-256 (for tokens, etc.)
 */
function hashString(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return bytes.map(function(b) {
    return ('0' + ((b < 0) ? (b + 256) : b).toString(16)).slice(-2);
  }).join('');
}

/**
 * Generate a secure session token (UUID-based)
 */
function generateToken(prefix) {
  return (prefix || 'USSESS_') + Utilities.getUuid() + Utilities.getUuid();
}

/**
 * Generate a secure reset token
 */
function generateResetToken() {
  return 'RST_' + Utilities.getUuid() + Utilities.getUuid();
}

/**
 * Sanitize string — strip HTML tags, trim, collapse whitespace
 */
function sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

/**
 * Sanitize email — lowercase, trim, basic format check
 */
function sanitizeEmail(email) {
  if (!email) return '';
  var e = String(email).toLowerCase().trim();
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(e)) return '';
  return e;
}

/**
 * Sanitize phone — keep only digits, max 15 chars
 */
function sanitizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '').substring(0, 15);
}

/**
 * Sanitize number — return parsed float or 0
 */
function sanitizeNumber(val) {
  var n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

/**
 * Sanitize GSTIN — 15-char alphanumeric
 */
function sanitizeGSTIN(gstin) {
  if (!gstin) return '';
  return String(gstin).toUpperCase().trim().substring(0, 15);
}

/**
 * Validate password strength (min 8, uppercase, lowercase, number)
 */
function validatePasswordStrength(pwd) {
  if (!pwd || pwd.length < 8) return { valid: false, msg: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(pwd)) return { valid: false, msg: 'Password must include an uppercase letter.' };
  if (!/[a-z]/.test(pwd)) return { valid: false, msg: 'Password must include a lowercase letter.' };
  if (!/[0-9]/.test(pwd)) return { valid: false, msg: 'Password must include a number.' };
  return { valid: true, msg: '' };
}

// ═══════════════════════════════════════
// STORAGE HELPER FUNCTIONS
// ═══════════════════════════════════════

/**
 * Get the master spreadsheet
 */
function getMasterSheet() {
  return SpreadsheetApp.openById(MASTER_SHEET_ID);
}

/**
 * Get or create a tab in the master sheet
 */
function getMasterTab(tabName) {
  var ss = getMasterSheet();
  var tab = ss.getSheetByName(tabName);
  if (!tab) {
    tab = ss.insertSheet(tabName);
    // Add headers based on tab name
    var headers = getTabHeaders(tabName);
    if (headers && headers.length > 0) {
      tab.getRange(1, 1, 1, headers.length).setValues([headers]);
      tab.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      tab.setFrozenRows(1);
    }
  }
  return tab;
}

/**
 * Get headers for each master tab
 */
function getTabHeaders(tabName) {
  var map = {};
  map[TAB_USERS] = ['userId', 'name', 'email', 'phone', 'passwordHash', 'salt', 'plan', 'premiumExpiry', 'referralCode', 'referredBy', 'status', 'resetTokenHash', 'resetTokenExpiry', 'resetRequests', 'createdAt'];
  map[TAB_SESSIONS] = ['token', 'userId', 'createdAt', 'expiresAt', 'type'];
  map[TAB_PAYMENTS] = ['paymentId', 'userId', 'utr', 'amount', 'requestedPlan', 'status', 'createdAt', 'verifiedAt', 'verifiedBy', 'rejectReason', 'planDaysGranted'];
  map[TAB_REFERRALS] = ['referrerId', 'referredId', 'referredEmail', 'status', 'createdAt'];
  map[TAB_CONTACTS] = ['formId', 'userId', 'userName', 'userEmail', 'message', 'status', 'reply', 'createdAt'];
  map[TAB_TICKETS] = ['ticketId', 'userId', 'userEmail', 'utr', 'amount', 'requestedPlan', 'paymentDate', 'description', 'status', 'resolution', 'createdAt', 'resolvedAt', 'resolvedBy'];
  map[TAB_AUDIT] = ['timestamp', 'adminTokenHash', 'action', 'targetUserId', 'details'];
  map[TAB_EVENTS] = ['eventId', 'eventType', 'eventName', 'targetUserId', 'reward', 'rewardDetail', 'status', 'createdAt'];
  map[TAB_BROADCASTS] = ['broadcastId', 'message', 'link', 'active', 'createdAt', 'clearedAt'];
  map[TAB_SETTINGS] = ['key', 'value'];
  return map[tabName] || [];
}

/**
 * Get user-specific spreadsheet
 */
function getUserSheet(userId) {
  var folder = getUserFolder(userId);
  if (!folder) return null;
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  return null;
}

/**
 * Get user's Drive folder
 */
function getUserFolder(userId) {
  var root = DriveApp.getFolderById(MASTER_FOLDER_ID);
  var folders = root.getFoldersByName(userId);
  while (folders.hasNext()) {
    return folders.next();
  }
  return null;
}

/**
 * Create user folder and sheet during registration
 */
function _createUserFolder(userId) {
  var root = DriveApp.getFolderById(MASTER_FOLDER_ID);
  var userFolder = root.createFolder(userId);
  userFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  // Create user spreadsheet
  var ss = SpreadsheetApp.create('LumiBooks_' + userId);
  var file = DriveApp.getFileById(ss.getId());
  DriveApp.Files.move(file, userFolder);
  // Create all user tabs
  var userTabs = [UTAB_PROFILE, UTAB_TRANSACTIONS, UTAB_BILLS, UTAB_STOCK, UTAB_CUSTOMERS,
                  UTAB_CUST_PAYMENTS, UTAB_STAFF, UTAB_ATTENDANCE, UTAB_STAFF_PAYMENTS,
                  UTAB_CATEGORIES, UTAB_CUSTOM_FIELDS, UTAB_WARRANTY];
  var userHeaders = getUserTabHeaders();
  for (var i = 0; i < userTabs.length; i++) {
    var tab = ss.getSheetByName(userTabs[i]);
    if (!tab) {
      tab = ss.insertSheet(userTabs[i]);
    }
    if (userHeaders[userTabs[i]]) {
      tab.getRange(1, 1, 1, userHeaders[userTabs[i]].length).setValues([userHeaders[userTabs[i]]]);
      tab.getRange(1, 1, 1, userHeaders[userTabs[i]].length).setFontWeight('bold');
      tab.setFrozenRows(1);
    }
  }
  // Remove default Sheet1 if exists
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) ss.deleteSheet(defaultSheet);
  // Initialize default categories
  initDefaultCategories(ss);
  // Initialize profile
  var profileTab = ss.getSheetByName(UTAB_PROFILE);
  var profileDefaults = [
    ['businessName', ''], ['address', ''], ['phone', ''], ['email', ''],
    ['gstIn', ''], ['currency', 'INR'], ['billPrefix', 'LB'], ['billCounter', '1']
  ];
  profileTab.getRange(2, 1, profileDefaults.length, 2).setValues(profileDefaults);
  return { folderId: userFolder.getId(), sheetId: ss.getId() };
}

/**
 * Get headers for user tabs
 */
function getUserTabHeaders() {
  return {};
  // Headers initialized per-tab below
}

/**
 * Initialize default categories in user sheet
 */
function initDefaultCategories(ss) {
  var tab = ss.getSheetByName(UTAB_CATEGORIES);
  for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    var cat = DEFAULT_CATEGORIES[i];
    tab.appendRow([
      Utilities.getUuid(), cat.name, cat.type, cat.icon, cat.color,
      new Date().toISOString(), true
    ]);
  }
}

/**
 * Get user tab or create if missing
 */
function getUserTab(userId, tabName) {
  var ss = getUserSheet(userId);
  if (!ss) return null;
  var tab = ss.getSheetByName(tabName);
  if (!tab) {
    tab = ss.insertSheet(tabName);
    var headers = _getUserTabHeaderMap()[tabName];
    if (headers) {
      tab.getRange(1, 1, 1, headers.length).setValues([headers]);
      tab.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      tab.setFrozenRows(1);
    }
  }
  return tab;
}

/**
 * Header map for user tabs
 */
function _getUserTabHeaderMap() {
  return {
    'Profile': ['key', 'value'],
    'Transactions': ['txnId', 'date', 'type', 'category', 'description', 'amount', 'gstRate', 'gstAmount', 'totalAmount', 'createdAt'],
    'Bills': ['billId', 'billNumber', 'date', 'customerName', 'customerPhone', 'customerGSTIN', 'customerAddress', 'items', 'subtotal', 'gstType', 'gstRate', 'cgstAmount', 'sgstAmount', 'igstAmount', 'totalAmount', 'template', 'status', 'shareToken', 'shareExpiry', 'warrantyEnabled', 'warrantyPeriod', 'customNotes', 'createdAt', 'updatedAt'],
    'Stock': ['itemId', 'sku', 'name', 'category', 'unit', 'costPrice', 'sellPrice', 'currentQty', 'reorderLevel', 'location', 'createdAt'],
    'Customers': ['customerId', 'name', 'phone', 'email', 'gstIn', 'address', 'creditLimit', 'createdAt'],
    'CustPayments': ['paymentId', 'customerId', 'date', 'amount', 'mode', 'againstBillId', 'notes', 'createdAt'],
    'Staff': ['staffId', 'name', 'role', 'department', 'salaryType', 'salaryAmount', 'bankAccount', 'bankName', 'ifsc', 'status', 'createdAt'],
    'Attendance': ['attendanceId', 'staffId', 'date', 'status', 'checkIn', 'checkOut', 'createdAt'],
    'StaffPayments': ['paymentId', 'staffId', 'month', 'year', 'amount', 'type', 'mode', 'notes', 'createdAt'],
    'Categories': ['categoryId', 'name', 'type', 'icon', 'color', 'createdAt', 'isDefault'],
    'CustomFields': ['fieldId', 'module', 'label', 'type', 'createdAt'],
    'WarrantyClaims': ['claimId', 'billId', 'billNumber', 'customerName', 'customerPhone', 'issueDescription', 'status', 'adminNotes', 'createdAt']
  };
}

/**
 * Get user's current plan config (handles expiry)
 */
function getUserPlanConfig(userId) {
  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      var planKey = String(data[i][6]).toLowerCase();
      var expiry = data[i][7];
      // Check if premium/standard/enterprise has expired
      if (planKey !== 'free' && expiry) {
        var expDate = new Date(expiry);
        if (expDate < new Date()) {
          // Plan expired — revert to free
          data[i][6] = 'free';
          data[i][7] = '';
          userTab.getRange(i + 1, 7, 1, 2).setValues([['free', '']]);
          planKey = 'free';
        }
      }
      return PLANS[planKey] || PLANS.free;
    }
  }
  return PLANS.free;
}

/**
 * Get user's raw plan key
 */
function getUserPlanKey(userId) {
  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      var planKey = String(data[i][6]).toLowerCase();
      var expiry = data[i][7];
      if (planKey !== 'free' && expiry) {
        if (new Date(expiry) < new Date()) {
          data[i][6] = 'free';
          data[i][7] = '';
          userTab.getRange(i + 1, 7, 1, 2).setValues([['free', '']]);
          return 'free';
        }
      }
      return planKey;
    }
  }
  return 'free';
}

/**
 * Get a setting from AppSettings tab
 */
function getAppSetting(key) {
  var tab = getMasterTab(TAB_SETTINGS);
  var data = tab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return '';
}

/**
 * Set a setting in AppSettings tab
 */
function setAppSetting(key, value) {
  var tab = getMasterTab(TAB_SETTINGS);
  var data = tab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      tab.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  tab.appendRow([key, value]);
}

/**
 * Generate next bill number
 */
function getNextBillNumber(userId) {
  var profileTab = getUserTab(userId, UTAB_PROFILE);
  if (!profileTab) return 'LB-0001';
  var data = profileTab.getDataRange().getValues();
  var prefix = 'LB';
  var counter = 1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'billPrefix') prefix = data[i][1] || 'LB';
    if (data[i][0] === 'billCounter') counter = parseInt(data[i][1]) || 1;
  }
  var billNum = prefix + '-' + String(counter).padStart(4, '0');
  // Update counter
  for (var j = 1; j < data.length; j++) {
    if (data[j][0] === 'billCounter') {
      profileTab.getRange(j + 1, 2).setValue(counter + 1);
      break;
    }
  }
  return billNum;
}

/**
 * Check if user has reached a plan limit
 */
function checkPlanLimit(userId, limitType, currentCount) {
  var config = getUserPlanConfig(userId);
  var limit = config[limitType];
  if (limit === Infinity) return { ok: true, limit: Infinity, current: currentCount };
  return { ok: currentCount < limit, limit: limit, current: currentCount };
}

/**
 * Create a JSON response for doPost
 */
function jsonResponse(data, status) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Parse JSON body from doPost
 */
function parseBody(e) {
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return null;
  }
}

/**
 * Safe get user tab — returns null-checked tab, never crashes
 */
function requireUserTab(userId, tabName) {
  var tab = getUserTab(userId, tabName);
  if (!tab) {
    throw new Error('Module not available. Please try again.');
  }
  return tab;
}
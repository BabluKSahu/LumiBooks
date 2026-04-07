/**
 * Auth.gs — LumiBooks v3
 * Registration, login, logout, sessions, profile, password reset, contact form, referral.
 */

// ═══════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════
function registerUser(params) {
  try {
    var name = sanitize(params.name);
    var email = sanitizeEmail(params.email);
    var phone = sanitizePhone(params.phone);
    var password = params.password;
    var referralCode = sanitize(params.referralCode);

    if (!name || name.length < 2) return jsonResponse({ success: false, error: 'Please enter a valid name (min 2 characters).' });
    if (!email) return jsonResponse({ success: false, error: 'Please enter a valid email address.' });
    if (!phone || phone.length < 10) return jsonResponse({ success: false, error: 'Please enter a valid phone number.' });

    var pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) return jsonResponse({ success: false, error: pwdCheck.msg });

    // Check duplicate email
    var userTab = getMasterTab(TAB_USERS);
    var data = userTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2]).toLowerCase() === email) {
        return jsonResponse({ success: false, error: 'An account with this email already exists.' });
      }
    }

    // Generate user ID, salt, hash
    var userId = 'USR_' + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
    var salt = generateSalt();
    var passwordHash = hashPassword(password, salt);
    var myReferralCode = Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();

    // Create user record
    userTab.appendRow([
      userId, name, email, phone, passwordHash, salt,
      'free', '', myReferralCode, '', 'active',
      '', '', '0', new Date().toISOString()
    ]);

    // Create isolated user folder and sheet
    var result = _createUserFolder(userId);

    // Handle referral
    if (referralCode) {
      handleReferralOnRegister(userId, email, referralCode);
    }

    // Create session
    var token = generateToken('USSESS_');
    var expiresAt = new Date(Date.now() + SESSION_EXPIRY_USER_MS).toISOString();
    var sessionTab = getMasterTab(TAB_SESSIONS);
    sessionTab.appendRow([token, userId, new Date().toISOString(), expiresAt, 'user']);

    return jsonResponse({
      success: true,
      token: token,
      userId: userId,
      referralCode: myReferralCode
    });

  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

/**
 * Handle referral during registration
 */
function handleReferralOnRegister(newUserId, newEmail, referralCode) {
  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();
  var referrerId = null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][8]).toUpperCase() === referralCode.toUpperCase()) {
      referrerId = data[i][0];
      break;
    }
  }

  if (!referrerId) return;

  // Log referral
  var refTab = getMasterTab(TAB_REFERRALS);
  refTab.appendRow([referrerId, newUserId, newEmail, 'active', new Date().toISOString()]);

  // Grant 10 Premium days to referrer
  grantPremiumDays(referrerId, 10, 'Referral reward for referring ' + newEmail);

  // Update referredBy on new user
  for (var j = 1; j < data.length; j++) {
    if (data[j][0] === newUserId) {
      userTab.getRange(j + 1, 10).setValue(referrerId);
      break;
    }
  }
}

/**
 * Grant premium days to a user
 */
function grantPremiumDays(userId, days, reason) {
  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      var currentPlan = String(data[i][6]).toLowerCase();
      var currentExpiry = data[i][7];
      var baseDate;

      if (currentPlan === 'free' || !currentExpiry) {
        baseDate = new Date();
      } else {
        var expDate = new Date(currentExpiry);
        baseDate = expDate > new Date() ? expDate : new Date();
      }

      var newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      // Determine plan to set
      var newPlan = currentPlan === 'enterprise' ? 'enterprise' : 'premium';

      userTab.getRange(i + 1, 7, 1, 2).setValues([[newPlan, newExpiry.toISOString()]]);
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════
function loginUser(params) {
  try {
    var email = sanitizeEmail(params.email);
    var password = params.password;

    if (!email) return jsonResponse({ success: false, error: 'Please enter a valid email address.' });
    if (!password) return jsonResponse({ success: false, error: 'Please enter your password.' });

    var userTab = getMasterTab(TAB_USERS);
    var data = userTab.getDataRange().getValues();
    var found = false;
    var userId, userStatus, storedHash, storedSalt;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2]).toLowerCase() === email) {
        userId = data[i][0];
        userStatus = data[i][10];
        storedHash = data[i][4];
        storedSalt = data[i][5];
        found = true;
        break;
      }
    }

    if (!found) return jsonResponse({ success: false, error: 'Invalid email or password.' });

    if (userStatus === 'suspended') return jsonResponse({ success: false, error: 'Your account has been suspended. Please contact support.' });

    var inputHash = hashPassword(password, storedSalt);
    if (inputHash !== storedHash) return jsonResponse({ success: false, error: 'Invalid email or password.' });

    // Check premium expiry on login
    var planKey = String(data[i][6]).toLowerCase();
    var expiry = data[i][7];
    if (planKey !== 'free' && expiry && new Date(expiry) < new Date()) {
      userTab.getRange(i + 1, 7, 1, 2).setValues([['free', '']]);
      planKey = 'free';
    }

    // Create session
    var token = generateToken('USSESS_');
    var rawToken = generateResetToken();
    var tokenHash = hashString(rawToken);
    var tokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS).toISOString();
    var expiresAt = new Date(Date.now() + SESSION_EXPIRY_USER_MS).toISOString();
    var sessionTab = getMasterTab(TAB_SESSIONS);
    sessionTab.appendRow([token, userId, new Date().toISOString(), expiresAt, 'user']);

    return jsonResponse({
      success: true,
      token: token,
      userId: userId,
      plan: planKey
    });

  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════
function logoutUser(params) {
  try {
    var token = sanitize(params.token);
    if (!token) return jsonResponse({ success: false, error: 'Invalid request.' });

    var sessionTab = getMasterTab(TAB_SESSIONS);
    var data = sessionTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === token) {
        sessionTab.deleteRow(i + 1);
        break;
      }
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// VALIDATE SESSION
// ═══════════════════════════════════════
function validateSession(params) {
  try {
    var token = sanitize(params.token);
    if (!token) return jsonResponse({ success: false, error: 'Invalid session.' });

    var sessionTab = getMasterTab(TAB_SESSIONS);
    var data = sessionTab.getDataRange().getValues();
    var userId = null;
    var valid = false;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === token) {
        var expiresAt = new Date(data[i][3]).getTime();
        if (expiresAt > Date.now()) {
          userId = data[i][1];
          valid = true;
        }
        break;
      }
    }

    if (!valid) {
      // Clean up expired token
      if (i < data.length && data[i][0] === token) {
        sessionTab.deleteRow(i + 1);
      }
      return jsonResponse({ success: false, error: 'Session expired. Please log in again.' });
    }

    var planKey = getUserPlanKey(userId);
    var planConfig = PLANS[planKey];

    // Check for active broadcast
    var broadcast = null;
    var bcTab = getMasterTab(TAB_BROADCASTS);
    var bcData = bcTab.getDataRange().getValues();
    for (var j = 1; j < bcData.length; j++) {
      if (bcData[j][3] === true) {
        broadcast = { message: bcData[j][1], link: bcData[j][2] };
        break;
      }
    }

    return jsonResponse({
      success: true,
      userId: userId,
      plan: planKey,
      planConfig: {
        name: planConfig.name,
        price: planConfig.price,
        hasGST: planConfig.hasGST,
        hasPDF: planConfig.hasPDF,
        hasWarranty: planConfig.hasWarranty,
        hasCustomFields: planConfig.hasCustomFields,
        hasCSVExport: planConfig.hasCSVExport,
        hasCustomerPrint: planConfig.hasCustomerPrint,
        templates: planConfig.templates,
        transactionsPerMonth: planConfig.transactionsPerMonth,
        totalBills: planConfig.totalBills,
        stockItems: planConfig.stockItems,
        customers: planConfig.customers,
        staffMembers: planConfig.staffMembers,
        reportHistoryDays: planConfig.reportHistoryDays,
        customCategories: planConfig.customCategories,
        billEditWindowHours: planConfig.billEditWindowHours
      },
      broadcast: broadcast
    });

  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// GET PROFILE
// ═══════════════════════════════════════
function getProfile(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired. Please log in again.' });

  try {
    var profileTab = getUserTab(userId, UTAB_PROFILE);
    var userTab = getMasterTab(TAB_USERS);
    var userData = userTab.getDataRange().getValues();

    var name = '', email = '', phone = '', plan = 'free', premiumExpiry = '', referralCode = '', createdAt = '';

    for (var i = 1; i < userData.length; i++) {
      if (userData[i][0] === userId) {
        name = userData[i][1]; email = userData[i][2]; phone = userData[i][3];
        plan = userData[i][6]; premiumExpiry = userData[i][7];
        referralCode = userData[i][8]; createdAt = userData[i][13];
        break;
      }
    }

    var profileData = {};
    if (profileTab) {
      var pData = profileTab.getDataRange().getValues();
      for (var j = 1; j < pData.length; j++) {
        profileData[pData[j][0]] = pData[j][1];
      }
    }

    // Count referrals
    var refTab = getMasterTab(TAB_REFERRALS);
    var refData = refTab.getDataRange().getValues();
    var referralCount = 0;
    for (var k = 1; k < refData.length; k++) {
      if (refData[k][0] === userId && refData[k][3] === 'active') referralCount++;
    }

    return jsonResponse({
      success: true,
      name: name,
      email: email,
      phone: phone,
      plan: plan,
      premiumExpiry: premiumExpiry,
      referralCode: referralCode,
      referralCount: referralCount,
      createdAt: createdAt,
      profile: profileData
    });

  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// UPDATE PROFILE
// ═══════════════════════════════════════
function updateProfile(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired. Please log in again.' });

  try {
    var allowed = ['businessName', 'address', 'phone', 'email', 'gstIn', 'currency', 'billPrefix'];
    var profileTab = getUserTab(userId, UTAB_PROFILE);
    if (!profileTab) return jsonResponse({ success: false, error: 'Something went wrong.' });

    var data = profileTab.getDataRange().getValues();
    for (var key in params) {
      if (allowed.indexOf(key) === -1) continue;
      var value = sanitize(params[key]);
      // Special sanitization
      if (key === 'email') value = sanitizeEmail(value);
      if (key === 'phone') value = sanitizePhone(value);
      if (key === 'gstIn') value = sanitizeGSTIN(value);

      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          profileTab.getRange(i + 1, 2).setValue(value);
          found = true;
          break;
        }
      }
      if (!found) {
        profileTab.appendRow([key, value]);
      }
    }

    // Also update name/phone in Users tab if provided
    if (params.name) {
      var userTab = getMasterTab(TAB_USERS);
      var uData = userTab.getDataRange().getValues();
      for (var j = 1; j < uData.length; j++) {
        if (uData[j][0] === userId) {
          userTab.getRange(j + 1, 2).setValue(sanitize(params.name));
          break;
        }
      }
    }

    return jsonResponse({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// CHANGE PASSWORD
// ═══════════════════════════════════════
function changePassword(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired. Please log in again.' });

  try {
    var currentPassword = params.currentPassword;
    var newPassword = params.newPassword;

    if (!currentPassword || !newPassword) return jsonResponse({ success: false, error: 'Please fill in both password fields.' });

    var pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) return jsonResponse({ success: false, error: pwdCheck.msg });

    var userTab = getMasterTab(TAB_USERS);
    var data = userTab.getDataRange().getValues();
    var row = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        var storedHash = data[i][4];
        var storedSalt = data[i][5];
        if (hashPassword(currentPassword, storedSalt) !== storedHash) {
          return jsonResponse({ success: false, error: 'Current password is incorrect.' });
        }
        row = i;
        break;
      }
    }

    if (row === -1) return jsonResponse({ success: false, error: 'User not found.' });

    var newSalt = generateSalt();
    var newHash = hashPassword(newPassword, newSalt);
    userTab.getRange(row + 1, 5, 1, 2).setValues([[newHash, newSalt]]);

    // Terminate all sessions except current (force re-login on other devices)
    var token = sanitize(params.token);
    var sessionTab = getMasterTab(TAB_SESSIONS);
    var sData = sessionTab.getDataRange().getValues();
    for (var j = sData.length - 1; j >= 1; j--) {
      if (sData[j][1] === userId && sData[j][0] !== token) {
        sessionTab.deleteRow(j + 1);
      }
    }

    return jsonResponse({ success: true, message: 'Password changed successfully. Other sessions have been terminated.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// PASSWORD RESET
// ═══════════════════════════════════════
function requestPasswordReset(params) {
  try {
    var email = sanitizeEmail(params.email);
    if (!email) return jsonResponse({ success: false, error: 'Please enter a valid email address.' });

    var userTab = getMasterTab(TAB_USERS);
    var data = userTab.getDataRange().getValues();
    var foundRow = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2]).toLowerCase() === email) {
        foundRow = i;
        break;
      }
    }

    // Always return same message — never reveal if email exists
    if (foundRow === -1) {
      return jsonResponse({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
    }

    // Rate limit check
// AFTER (fixed — resets hourly):
var lastResetTime = data[foundRow][13]; // reuse column 13 as last reset timestamp
var oneHourAgo = Date.now() - 60 * 60 * 1000;
var lastResetMs = lastResetTime ? new Date(lastResetTime).getTime() : 0;

if (lastResetMs > oneHourAgo) {
  // Already requested within the last hour — check count from EventLog
  var eventTab = getMasterTab(TAB_EVENTS);
  var evtData = eventTab.getDataRange().getValues();
  var recentResets = 0;
  var userEmail = data[foundRow][2];
  for (var er = evtData.length - 1; er >= 1; er--) {
    if (evtData[er][2] === 'PASSWORD_RESET_REQUEST' && evtData[er][3] === userEmail) {
      var evtTime = new Date(evtData[er][7]).getTime();
      if (evtTime > oneHourAgo) recentResets++;
    }
  }
  if (recentResets >= MAX_RESET_REQUESTS_PER_HOUR) {
    return jsonResponse({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
  }
}

// Store hash + expiry + timestamp
userTab.getRange(foundRow + 1, 11, 1, 3).setValues([
  [tokenHash, tokenExpiry, new Date().toISOString()]
]);

// Log the reset request for rate limiting
var eventTab2 = getMasterTab(TAB_EVENTS);
eventTab2.appendRow([
  Utilities.getUuid(), 'security', 'PASSWORD_RESET_REQUEST', userEmail,
  'reset_link_sent', 'Password reset link sent', 'completed', new Date().toISOString()
]);

    // Send reset email
    var user = data[foundRow];
    var resetLink = ScriptApp.getService().getUrl() + '?page=landing&reset=' + rawToken;
    var subject = 'LumiBooks — Password Reset Request';
    var body = 'Hello ' + user[1] + ',\n\n' +
      'You requested a password reset for your LumiBooks account.\n\n' +
      'Click the link below to reset your password (valid for 15 minutes):\n' +
      resetLink + '\n\n' +
      'If you did not request this, please ignore this email. Your password will remain unchanged.\n\n' +
      'LumiBooks Team\nLumineerCo';

    MailApp.sendEmail(email, subject, body);

    return jsonResponse({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (err) {
    return jsonResponse({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
  }
}

function verifyResetToken(params) {
  try {
    var token = sanitize(params.token);
    if (!token) return jsonResponse({ success: false, error: 'Invalid reset link.' });

    var tokenHash = hashString(token);
    var userTab = getMasterTab(TAB_USERS);
    var data = userTab.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][11] === tokenHash) {
        var expiry = new Date(data[i][12]);
        if (expiry < new Date()) {
          // Clear expired token
          userTab.getRange(i + 1, 11, 1, 2).setValues([['', '']]);
          return jsonResponse({ success: false, error: 'expired' });
        }
        return jsonResponse({ success: true });
      }
    }

    return jsonResponse({ success: false, error: 'invalid' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'invalid' });
  }
}

function resetPassword(params) {
  try {
    var token = sanitize(params.token);
    var newPassword = params.newPassword;

    if (!token) return jsonResponse({ success: false, error: 'Invalid reset link.' });

    var pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) return jsonResponse({ success: false, error: pwdCheck.msg });

    var tokenHash = hashString(token);
    var userTab = getMasterTab(TAB_USERS);
    var data = userTab.getDataRange().getValues();
    var foundRow = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][11] === tokenHash) {
        var expiry = new Date(data[i][12]);
        if (expiry < new Date()) {
          userTab.getRange(i + 1, 11, 1, 2).setValues([['', '']]);
          return jsonResponse({ success: false, error: 'This link has expired. Please request a new one.' });
        }
        foundRow = i;
        break;
      }
    }

    if (foundRow === -1) return jsonResponse({ success: false, error: 'Invalid link. Please request a new one.' });

    // Update password
    var newSalt = generateSalt();
    var newHash = hashPassword(newPassword, newSalt);
    userTab.getRange(foundRow + 1, 5, 1, 4).setValues([[newHash, newSalt, '', '']]);

    // Terminate all sessions for this user
    var userId = data[foundRow][0];
    var sessionTab = getMasterTab(TAB_SESSIONS);
    var sData = sessionTab.getDataRange().getValues();
    for (var j = sData.length - 1; j >= 1; j--) {
      if (sData[j][1] === userId) {
        sessionTab.deleteRow(j + 1);
      }
    }

    return jsonResponse({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// CONTACT FORM
// ═══════════════════════════════════════
function submitContactForm(params) {
  try {
    var name = sanitize(params.name);
    var email = sanitizeEmail(params.email);
    var message = sanitize(params.message);

    if (!name || !email || !message) return jsonResponse({ success: false, error: 'Please fill in all fields.' });
    if (message.length > 1000) return jsonResponse({ success: false, error: 'Message too long. Maximum 1000 characters.' });

    var contactTab = getMasterTab(TAB_CONTACTS);
    contactTab.appendRow([
      Utilities.getUuid(), '', name, email, message, 'open', '', new Date().toISOString()
    ]);

    return jsonResponse({ success: true, message: 'Your message has been received. We will get back to you soon.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// PAYMENT SUBMISSION
// ═══════════════════════════════════════
function submitPayment(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var utr = sanitize(params.utr);
    var amount = sanitizeNumber(params.amount);
    var plan = sanitize(params.plan);

    if (!utr || utr.length < 6) return jsonResponse({ success: false, error: 'Please enter a valid UTR number.' });
    if (amount <= 0) return jsonResponse({ success: false, error: 'Please enter a valid amount.' });
    if (!PLANS[plan]) return jsonResponse({ success: false, error: 'Invalid plan selected.' });

    // Get user email
    var userTab = getMasterTab(TAB_USERS);
    var uData = userTab.getDataRange().getValues();
    var userEmail = '';
    for (var i = 1; i < uData.length; i++) {
      if (uData[i][0] === userId) { userEmail = uData[i][2]; break; }
    }

    var paymentTab = getMasterTab(TAB_PAYMENTS);
    paymentTab.appendRow([
      Utilities.getUuid(), userId, utr, amount, plan,
      'pending', new Date().toISOString(), '', '', '', ''
    ]);

    return jsonResponse({ success: true, message: 'Payment submitted successfully. Your payment will be verified within 48 hours.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

function getPaymentStatus(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var paymentTab = getMasterTab(TAB_PAYMENTS);
    var data = paymentTab.getDataRange().getValues();
    var payments = [];

    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][1] === userId) {
        payments.push({
          paymentId: data[i][0],
          utr: data[i][2],
          amount: data[i][3],
          requestedPlan: data[i][4],
          status: data[i][5],
          createdAt: data[i][6],
          rejectReason: data[i][9]
        });
        if (payments.length >= 10) break;
      }
    }

    return jsonResponse({ success: true, payments: payments });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// TICKET SYSTEM (Payment Verification Only)
// ═══════════════════════════════════════
function submitTicket(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var utr = sanitize(params.utr);
    var amount = sanitizeNumber(params.amount);
    var plan = sanitize(params.plan);
    var paymentDate = sanitize(params.paymentDate);
    var description = sanitize(params.description);

    if (!utr) return jsonResponse({ success: false, error: 'UTR number is required.' });
    if (amount <= 0) return jsonResponse({ success: false, error: 'Amount is required.' });

    var userTab = getMasterTab(TAB_USERS);
    var uData = userTab.getDataRange().getValues();
    var userEmail = '';
    for (var i = 1; i < uData.length; i++) {
      if (uData[i][0] === userId) { userEmail = uData[i][2]; break; }
    }

    var ticketTab = getMasterTab(TAB_TICKETS);
    ticketTab.appendRow([
      Utilities.getUuid(), userId, userEmail, utr, amount, plan,
      paymentDate, description, 'open', '', new Date().toISOString(), '', ''
    ]);

    return jsonResponse({ success: true, message: 'Your payment verification ticket has been submitted. We will resolve it within 48 hours.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

// ═══════════════════════════════════════
// BROADCAST
// ═══════════════════════════════════════
function getBroadcast(params) {
  try {
    var bcTab = getMasterTab(TAB_BROADCASTS);
    var data = bcTab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === true) {
        return jsonResponse({ success: true, broadcast: { message: data[i][1], link: data[i][2] } });
      }
    }
    return jsonResponse({ success: true, broadcast: null });
  } catch (err) {
    return jsonResponse({ success: true, broadcast: null });
  }
}

// ═══════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════
function _requireAuth(params) {
  var token = sanitize(params.token);
  if (!token) return null;

  var sessionTab = getMasterTab(TAB_SESSIONS);
  var data = sessionTab.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      var expiresAt = new Date(data[i][3]).getTime();
      if (expiresAt > Date.now()) {
        return data[i][1]; // userId
      } else {
        sessionTab.deleteRow(i + 1);
        return null;
      }
    }
  }
  return null;
}
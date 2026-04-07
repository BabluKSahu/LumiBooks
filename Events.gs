/**
 * Events.gs — LumiBooks v3
 * Autonomous event engine — monthly/yearly promotions, auto-premium, mega discounts.
 * Runs via time-based triggers. All rewards are plan day grants — zero cash.
 * Idempotent: checks if reward was already given before re-applying.
 */

// ═══════════════════════════════════════
// EVENT CALENDAR CONFIGURATION
// ═══════════════════════════════════════
function _defineEventCalendar() {
  return [
    // Fixed date events
    { month: 1, day: 1, name: 'New Year Special', type: 'yearly', target: 'all', reward: 'premium_days', amount: 3, targetPlan: 'free', description: 'New Year — 3 free Premium days for Free users' },
    { month: 1, day: 26, name: 'Republic Day Offer', type: 'yearly', target: 'free', reward: 'banner', description: 'Standard at ₹149 — Republic Day discount banner' },
    { month: 3, day: 31, name: 'FY End Extended Reports', type: 'yearly', target: 'standard', reward: 'extended_reports', days: 7, description: 'Free 90-day report access for Standard users' },
    { month: 4, day: 1, name: 'New Financial Year', type: 'yearly', target: 'all', reward: 'broadcast', description: 'New FY — upgrade and get 7 extra days' },
    { month: 8, day: 15, name: 'Independence Day', type: 'yearly', target: 'all', reward: 'premium_days', amount: 3, targetPlan: 'standard', description: 'Free 3-day Standard for all + referral bonus doubled' },
    // Diwali — dynamically calculated (approx Oct/Nov)
    // AFTER (calculates Diwali dynamically for 2025-2030):
    (function() {
  // Diwali dates: 2025=Oct 20, 2026=Nov 8, 2027=Oct 26, 2028=Nov 14, 2029=Nov 3, 2030=Oct 22
  var diwaliMap = {2025:[10,20],2026:[11,8],2027:[10,26],2028:[11,14],2029:[11,3],2030:[10,22]};
  var y = new Date().getFullYear();
  var d = diwaliMap[y] || [10,20];
  return { month: d[0], day: d[1], name: 'Diwali Dhamaka', type: 'yearly', target: 'free', reward: 'premium_days', amount: 7, description: 'Free 7-day Premium for all active Free users' };
  })(),
// Monthly recurring events
    { month: 0, day: 1, name: 'Monthly Loyalty Check', type: 'monthly', target: 'loyal', reward: 'loyalty_days', description: 'Loyalty rewards for long-term users' },
    { month: 0, day: 28, name: 'Top Referrer Monthly', type: 'monthly', target: 'top_referrer', reward: 'premium_days', amount: 5, description: 'Top 3 referrers get 5 extra Premium days' }
  ];
}

// ═══════════════════════════════════════
// MAIN TRIGGER FUNCTIONS
// ═══════════════════════════════════════

/**
 * Run monthly events — called by time trigger on 1st of each month
 */
function runMonthlyEvents() {
  var now = new Date();
  var calendar = _defineEventCalendar();
  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();

  for (var e = 0; e < calendar.length; e++) {
    var event = calendar[e];
    if (event.type !== 'monthly' && event.type !== 'yearly') continue;

    // Check if event matches today
    var match = false;
    if (event.type === 'monthly') {
      match = now.getDate() === 1; // Run monthly events on 1st
    } else if (event.type === 'yearly') {
      match = now.getMonth() + 1 === event.month && now.getDate() === event.day;
    }
    if (!match) continue;

    // Check if already ran today
    if (_eventAlreadyRan(event.name, now)) continue;

    // Apply event
    _applyEvent(event, data, userTab, now);
  }
}

/**
 * Run yearly events — called by time trigger on Jan 1
 */
function runYearlyEvents() {
  runMonthlyEvents(); // Yearly events are in the same calendar
}

/**
 * Check and activate events — called by daily trigger
 */
function checkAndActivateEvents() {
  var now = new Date();
  var maintenance = getAppSetting('maintenance_mode');
  if (maintenance === 'true') return; // Don't run events during maintenance

  runMonthlyEvents();
}

// ═══════════════════════════════════════
// EVENT APPLICATION LOGIC
// ═══════════════════════════════════════
function _applyEvent(event, userData, userTab, now) {
  var eventTab = getMasterTab(TAB_EVENTS);

  switch (event.name) {
    case 'New Year Special':
      for (var i = 1; i < userData.length; i++) {
        if (userData[i][10] !== 'active') continue;
        if (String(userData[i][6]).toLowerCase() === 'free') {
          grantPremiumDays(userData[i][0], event.amount, event.name);
          eventTab.appendRow([Utilities.getUuid(), event.type, event.name, userData[i][0], 'premium_days', event.amount + ' days Premium', 'completed', now.toISOString()]);
        }
      }
      _sendEventNotification('all', 'Happy New Year! 🎉 Free users get 3 days of Premium!', '');
      break;

    case 'Republic Day Offer':
      _sendEventNotification('free', '🇮🇳 Republic Day Special! Upgrade to Standard at just ₹149.', '');
      eventTab.appendRow([Utilities.getUuid(), event.type, event.name, 'all-free', 'banner', 'Standard ₹149 banner', 'completed', now.toISOString()]);
      break;

    case 'FY End Extended Reports':
      for (var j = 1; j < userData.length; j++) {
        if (userData[j][10] !== 'active') continue;
        if (String(userData[j][6]).toLowerCase() === 'standard') {
          eventTab.appendRow([Utilities.getUuid(), event.type, event.name, userData[j][0], 'extended_reports', '7-day extended report access', 'completed', now.toISOString()]);
        }
      }
      _sendEventNotification('standard', '📊 Financial Year End — Free 90-day report access for 7 days!', '');
      break;

    case 'New Financial Year':
      _sendEventNotification('all', '🆕 New Financial Year! Upgrade now and get 7 extra Premium days.', '');
      eventTab.appendRow([Utilities.getUuid(), event.type, event.name, 'all', 'broadcast', 'New FY broadcast', 'completed', now.toISOString()]);
      break;

    case 'Independence Day':
      for (var k = 1; k < userData.length; k++) {
        if (userData[k][10] !== 'active') continue;
        if (String(userData[k][6]).toLowerCase() === 'free') {
          grantPremiumDays(userData[k][0], 3, event.name + ' — Standard trial');
        }
      }
      _sendEventNotification('all', '🇮🇳 Independence Day! Free 3-day Standard for all + referral bonus doubled!', '');
      break;

    case 'Diwali Dhamaka':
      for (var l = 1; l < userData.length; l++) {
        if (userData[l][10] !== 'active') continue;
        if (String(userData[l][6]).toLowerCase() === 'free') {
          // Check if user was active in last 30 days (has recent transactions)
          if (_isUserActive(userData[l][0], 30)) {
            grantPremiumDays(userData[l][0], 7, event.name);
            eventTab.appendRow([Utilities.getUuid(), event.type, event.name, userData[l][0], 'premium_days', '7 days Premium', 'completed', now.toISOString()]);
          }
        }
      }
      _sendEventNotification('all', '🪔 Diwali Dhamaka! Active Free users get 7 days of Premium!', '');
      break;

    case 'Monthly Loyalty Check':
      for (var m = 1; m < userData.length; m++) {
        if (userData[m][10] !== 'active') continue;
        var createdDate = new Date(userData[m][13]);
        var diffMonths = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth());

        if (diffMonths >= 12) {
          grantPremiumDays(userData[m][0], 5, event.name + ' — 12+ months');
          eventTab.appendRow([Utilities.getUuid(), event.type, event.name, userData[m][0], 'premium_days', '5 days Premium (12+ months)', 'completed', now.toISOString()]);
        } else if (diffMonths >= 6) {
          grantPremiumDays(userData[m][0], 2, event.name + ' — 6+ months');
          eventTab.appendRow([Utilities.getUuid(), event.type, event.name, userData[m][0], 'premium_days', '2 days Standard (6+ months)', 'completed', now.toISOString()]);
        }
      }
      break;

    case 'Top Referrer Monthly':
      var refTab = getMasterTab(TAB_REFERRALS);
      var refData = refTab.getDataRange().getValues();
      var lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      var lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      var refCounts = {};

      for (var r = 1; r < refData.length; r++) {
        var refDate = new Date(refData[r][4]);
        if (refDate >= lastMonthStart && refDate <= lastMonthEnd) {
          var refId = refData[r][0];
          refCounts[refId] = (refCounts[refId] || 0) + 1;
        }
      }

      var sorted = Object.keys(refCounts).sort(function(a, b) { return refCounts[b] - refCounts[a]; });
      var top3 = sorted.slice(0, 3);

      for (var t = 0; t < top3.length; t++) {
        grantPremiumDays(top3[t], 5, event.name + ' — Rank ' + (t + 1));
        eventTab.appendRow([Utilities.getUuid(), event.type, event.name, top3[t], 'premium_days', '5 days Premium (top referrer #' + (t + 1) + ')', 'completed', now.toISOString()]);
      }
      break;
  }
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function _eventAlreadyRan(eventName, date) {
  var eventTab = getMasterTab(TAB_EVENTS);
  var data = eventTab.getDataRange().getValues();
  var todayStr = date.toISOString().split('T')[0];

  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === eventName) {
      var runDate = new Date(data[i][7]).toISOString().split('T')[0];
      if (runDate === todayStr) return true;
    }
  }
  return false;
}

function _isUserActive(userId, days) {
  var txnTab = getUserTab(userId, UTAB_TRANSACTIONS);
  if (!txnTab) return false;
  var data = txnTab.getDataRange().getValues();
  var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (var i = 1; i < data.length; i++) {
    if (new Date(data[i][9]).getTime() > cutoff) return true;
  }
  return false;
}

function _sendEventNotification(target, message, link) {
  // Store as broadcast — shown to users on next session validate
  var existing = getAppSetting('broadcast_active');
  if (existing === 'true') return; // Don't overwrite existing broadcast

  setAppSetting('broadcast_msg', message);
  setAppSetting('broadcast_link', link);
  setAppSetting('broadcast_active', 'true');
  setAppSetting('broadcast_created', new Date().toISOString());
  setAppSetting('broadcast_source', 'event');
}

function sendEventNotification(target, message, link) {
  _sendEventNotification(target, message, link);
}

function applyEventReward(userId, reward) {
  // Called from admin manual trigger
  grantPremiumDays(userId, parseInt(reward) || 0, 'Manual event trigger');
}

function _getActiveEvents() {
  return _defineEventCalendar().filter(function(e) {
    var now = new Date();
    if (e.type === 'monthly') return now.getDate() === 1;
    if (e.type === 'yearly') return now.getMonth() + 1 === e.month && now.getDate() === e.day;
    return false;
  });
}
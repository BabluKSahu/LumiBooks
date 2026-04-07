/**
 * Admin.gs — LumiBooks v3
 * Full admin panel — 100% inside this file, NO admin.html.
 * Accessed via secret URL parameter. Separate credential system.
 * ADMSESS_ token prefix. 8-hour expiry. Full audit trail.
 */

// ═══════════════════════════════════════
// ADMIN doGet — Render inline HTML panel
// ═══════════════════════════════════════
function adminDoGet(e) {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LumiBooks Admin</title>';
  html += '<style>';
  html += '*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;background:#0f1117;color:#e1e4e8;padding:20px}';
  html += '.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding:16px 20px;background:#161b22;border:1px solid #30363d;border-radius:12px}';
  html += '.header h1{font-size:20px;font-weight:600;color:#f0f6fc}.header span{font-size:13px;color:#8b949e}';
  html += '.logout-btn{background:#21262d;color:#f85149;border:1px solid #f8514940;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px}';
  html += '.logout-btn:hover{background:#f8514920}.login-wrap{max-width:400px;margin:80px auto;padding:32px;background:#161b22;border:1px solid #30363d;border-radius:16px}';
  html += '.login-wrap h2{margin-bottom:20px;color:#f0f6fc}.login-wrap input{width:100%;padding:12px;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#e1e4e8;margin-bottom:12px;font-size:14px}';
  html += '.login-wrap input:focus{outline:none;border-color:#378ADD}.login-btn{width:100%;padding:12px;background:#378ADD;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500}';
  html += '.login-btn:hover{background:#2b6cb0}.error{color:#f85149;font-size:13px;margin-top:8px}';
  html += '.tabs{display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap}';
  html += '.tab{padding:8px 16px;background:#161b22;border:1px solid #30363d;border-radius:8px 8px 0 0;cursor:pointer;font-size:13px;color:#8b949e;border-bottom:none}';
  html += '.tab.active{background:#21262d;color:#f0f6fc;border-color:#378ADD}';
  html += '.panel{background:#161b22;border:1px solid #30363d;border-radius:0 12px 12px 12px;padding:20px;display:none;min-height:400px}';
  html += '.panel.active{display:block}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}';
  html += '.metric{background:#21262d;border-radius:10px;padding:16px;text-align:center}.metric-val{font-size:28px;font-weight:600;color:#378ADD}.metric-lbl{font-size:12px;color:#8b949e;margin-top:4px}';
  html += 'table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:10px;background:#21262d;color:#8b949e;font-weight:500;border-bottom:1px solid #30363d;position:sticky;top:0}';
  html += 'td{padding:10px;border-bottom:1px solid #21262d;color:#e1e4e8}tr:hover td{background:#1c2129}';
  html += '.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500}';
  html += '.badge-pending{background:#63380630;color:#d29922}.badge-approved{background:#1d9e7530;color:#3fb950}.badge-rejected{background:#791f1f30;color:#f85149}';
  html += '.badge-free{background:#0c447c30;color:#58a6ff}.badge-standard{background:#27500a30;color:#3fb950}.badge-premium{background:#63380630;color:#d29922}.badge-enterprise{background:#72243e30;color:#f778ba}';
  html += '.btn{padding:6px 14px;border:1px solid #30363d;background:#21262d;color:#e1e4e8;border-radius:6px;cursor:pointer;font-size:12px;margin:2px}.btn:hover{background:#30363d}.btn-primary{background:#378ADD;border-color:#378ADD;color:#fff}.btn-danger{background:#f8514930;border-color:#f85149;color:#f85149}.btn-success{background:#1d9e7530;border-color:#1d9e75;color:#3fb950}';
  html += '.input{padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px}.input:focus{outline:none;border-color:#378ADD}';
  html += '.select{padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px}';
  html += '.search-bar{display:flex;gap:8px;margin-bottom:16px}.search-bar input{flex:1}';
  html += '.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;display:none}';
  html += '.modal-overlay.show{display:flex}.modal{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;width:90%;max-width:500px;max-height:80vh;overflow-y:auto}';
  html += '.modal h3{margin-bottom:16px;color:#f0f6fc}.modal label{display:block;font-size:12px;color:#8b949e;margin-bottom:4px;margin-top:12px}';
  html += '.modal-actions{display:flex;gap:8px;margin-top:20px;justify-content:flex-end}';
  html += '.empty{text-align:center;padding:40px;color:#8b949e;font-size:14px}';
  html += '</style></head><body>';
  html += '<div id="app"></div>';
  html += '<div class="modal-overlay" id="modalOverlay"><div class="modal" id="modalContent"></div></div>';
  html += '<script>';
  html += 'var BASE="' + ScriptApp.getService().getUrl() + '";';
  html += 'var token="";var currentTab="dashboard";';
  html += 'function api(action,params){return fetch(BASE,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({action:action,params:Object.assign({token:token},params||{})})}).then(r=>r.json())}';
  html += 'function showTab(t){currentTab=t;document.querySelectorAll(".tab").forEach(e=>e.classList.remove("active"));document.querySelectorAll(".panel").forEach(e=>e.classList.remove("active"));document.querySelector(\'[data-tab="\'+t+\'"]\').classList.add("active");document.getElementById("panel-"+t).classList.add("active");loadTab(t)}';
  html += 'function loadTab(t){if(t==="dashboard")loadDashboard();if(t==="users")loadUsers();if(t==="payments")loadPayments();if(t==="tickets")loadTickets();if(t==="referrals")loadReferrals();if(t==="warranty")loadWarranty();if(t==="contacts")loadContacts();if(t==="settings")loadSettings();if(t==="events")loadEvents();if(t==="broadcast")loadBroadcast()}';
  html += 'function closeModal(){document.getElementById("modalOverlay").classList.remove("show")}';
  html += 'function openModal(html){document.getElementById("modalContent").innerHTML=html;document.getElementById("modalOverlay").classList.add("show")}';
  html += 'function planBadge(p){var m={"free":"badge-free","standard":"badge-standard","premium":"badge-premium","enterprise":"badge-enterprise"};return \'<span class="badge \'+(m[p]||"badge-free")+\'">\'+_cap(p)+\'</span>\'}';
  html += 'function statusBadge(s){var m={"pending":"badge-pending","approved":"badge-approved","rejected":"badge-rejected","open":"badge-pending","resolved":"badge-approved"};return \'<span class="badge \'+(m[s]||"badge-pending")+\'">\'+_cap(s)+\'</span>\'}';
  html += 'function _cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):""}';
  html += 'function fmtDate(d){if(!d)return"-";try{var dt=new Date(d);return dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}catch(e){return d}}';
  html += 'function fmtINR(n){return "₹"+(Number(n)||0).toLocaleString("en-IN")}';
  html += 'function init(){token=localStorage.getItem("admin_token")||"";if(token){api("admin_validate").then(r=>{if(r.success)renderPanel();else renderLogin()})}else renderLogin()}';
  html += 'function renderLogin(){document.getElementById("app").innerHTML=\'<div class="login-wrap"><h2>LumiBooks Admin</h2><input type="text" id="auser" placeholder="Username"><input type="password" id="apass" placeholder="Password"><button class="login-btn" onclick="doLogin()">Login</button><div class="error" id="loginErr"></div></div>\'}';
  html += 'function doLogin(){var u=document.getElementById("auser").value,p=document.getElementById("apass").value;if(!u||!p){document.getElementById("loginErr").textContent="Fill in all fields";return}api("admin_login",{username:u,password:p}).then(r=>{if(r.success){token=r.token;localStorage.setItem("admin_token",token);renderPanel()}else document.getElementById("loginErr").textContent=r.error||"Login failed"})}';
  html += 'function doLogout(){token="";localStorage.removeItem("admin_token");renderLogin()}';
  html += 'function renderPanel(){var h=\'<div class="header"><div><h1>LumiBooks Admin Panel</h1><span>LumineerCo — Internal</span></div><button class="logout-btn" onclick="doLogout()">Logout</button></div>\';';
  html += 'h+=\'<div class="tabs">\';';
  html += 'var tabs=[["dashboard","Dashboard"],["users","Users"],["payments","Payments"],["tickets","Tickets"],["referrals","Referrals"],["warranty","Warranty"],["contacts","Support"],["settings","Settings"],["events","Events"],["broadcast","Broadcast"]];';
  html += 'tabs.forEach(function(t){h+=\'<div class="tab\'+(t[0]===currentTab?" active":"")+\'" data-tab="\'+t[0]+\'" onclick="showTab(\\\'\'+t[0]+\'\\\')">\'+t[1]+\'</div>\'});';
  html += 'h+=\'</div>\';';
  html += 'tabs.forEach(function(t){h+=\'<div class="panel\'+(t[0]===currentTab?" active":"")+\'" id="panel-\'+t[0]+\'"><div class="empty">Loading...</div></div>\'});';
  html += 'document.getElementById("app").innerHTML=h;loadTab(currentTab)}';
  // Dashboard
  html += 'function loadDashboard(){api("admin_getDashboard").then(r=>{if(!r.success)return;var d=r.data;var h=\'<div class="metrics">\';';
  html += 'h+=\'<div class="metric"><div class="metric-val">\'+d.totalUsers+\'</div><div class="metric-lbl">Total Users</div></div>\';';
  html += 'h+=\'<div class="metric"><div class="metric-val">\'+d.activeSessions+\'</div><div class="metric-lbl">Active Sessions</div></div>\';';
  html += 'h+=\'<div class="metric"><div class="metric-val" style="color:#d29922">\'+d.pendingPayments+\'</div><div class="metric-lbl">Pending Payments</div></div>\';';
  html += 'h+=\'<div class="metric"><div class="metric-val" style="color:#3fb950">\'+fmtINR(d.revenueMTD)+\'</div><div class="metric-lbl">Revenue (MTD)</div></div>\';';
  html += 'h+=\'<div class="metric"><div class="metric-val">\'+d.newUsersMTD+\'</div><div class="metric-lbl">New Users (MTD)</div></div>\';';
  html += 'h+=\'<div class="metric"><div class="metric-val">\'+d.openTickets+\'</div><div class="metric-lbl">Open Tickets</div></div>\';';
  html += 'h+=\'</div>\';';
  html += 'h+=\'<h3 style="color:#f0f6fc;margin-bottom:12px">Plan Distribution</h3>\';';
  html += 'h+=\'<table><tr><th>Plan</th><th>Users</th></tr>\';';
  html += 'for(var p in d.planDist){h+=\'<tr><td>\'+planBadge(p)+\'</td><td>\'+d.planDist[p]+\'</td></tr>\'}';
  html += 'h+=\'</table>\';';
  html += 'document.getElementById("panel-dashboard").innerHTML=h})}';
  // Users
  html += 'function loadUsers(){api("admin_getUsers").then(r=>{if(!r.success)return;var u=r.users;var h=\'<div class="search-bar"><input class="input" id="userSearch" placeholder="Search by name, email..." oninput="filterUsers()"><select class="select" id="userFilter" onchange="filterUsers()"><option value="">All Plans</option><option value="free">Free</option><option value="standard">Standard</option><option value="premium">Premium</option><option value="enterprise">Enterprise</option></select></div>\';';
  html += 'h+=\'<table id="usersTable"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Plan</th><th>Expiry</th><th>Status</th><th>Actions</th></tr>\';';
  html += 'u.forEach(function(u){h+=\'<tr data-plan="\'+u.plan+\'" data-search="\'+(u.name+u.email).toLowerCase()+\'">\';';
  html += 'h+=\'<td>\'+u.name+\'</td><td>\'+u.email+\'</td><td>\'+(u.phone||"-")+\'</td><td>\'+planBadge(u.plan)+\'</td><td>\'+fmtDate(u.premiumExpiry)+\'</td><td>\'+statusBadge(u.status)+\'</td>\';';
  html += 'h+=\'<td><button class="btn btn-primary" onclick="openPlanModal(\\\'\'+u.userId+\'\\\',\\\'\'+u.plan+\'\\\',\\\'\'+u.premiumExpiry+\'\\\')">Plan</button> \';';
  html += 'h+=\'<button class="btn \'+(u.status==="active"?"btn-danger":"btn-success")+\'" onclick="toggleStatus(\\\'\'+u.userId+\'\\\',\\\'\'+u.status+\'\\\')">\'+(u.status==="active"?"Suspend":"Activate")+\'</button> \';';
  html += 'h+=\'<button class="btn btn-danger" onclick="deleteUser(\\\'\'+u.userId+\'\\\')">×</button></td></tr>\'});';
  html += 'h+=\'</table>\';document.getElementById("panel-users").innerHTML=h})}';
  html += 'function filterUsers(){var s=document.getElementById("userSearch").value.toLowerCase();var p=document.getElementById("userFilter").value;document.querySelectorAll("#usersTable tr").forEach(function(r){if(!r.dataset.plan)return;var ms=r.dataset.search.indexOf(s)!==-1;var mp=!p||r.dataset.plan===p;r.style.display=(ms&&mp)?"":"none"})}';
  html += 'function openPlanModal(uid,cp,ce){var h=\'<h3>Change Plan</h3><label>New Plan</label><select class="select" id="newPlan" style="width:100%"><option value="free"\'+(cp==="free"?" selected":"")+\'">Free</option><option value="standard"\'+(cp==="standard"?" selected":"")+\'">Standard</option><option value="premium"\'+(cp==="premium"?" selected":"")+\'">Premium</option><option value="enterprise"\'+(cp==="enterprise"?" selected":"")+\'">Enterprise</option></select>\';';
  html += 'h+=\'<label>Premium Expiry (leave empty for no expiry)</label><input type="date" class="input" id="newExpiry" style="width:100%" value="\'+(ce?ce.split("T")[0]:"")+\'">\';';
  html += 'h+=\'<label>Plan Days to Add (optional — extends from current/new expiry)</label><input type="number" class="input" id="planDays" style="width:100%" placeholder="e.g. 30">\';';
  html += 'h+=\'<div class="modal-actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="setPlan(\\\'\'+uid+\'\\\')">Update</button></div>\';openModal(h)}';
  html += 'function setPlan(uid){var p=document.getElementById("newPlan").value;var e=document.getElementById("newExpiry").value;var d=document.getElementById("planDays").value;api("admin_setUserPlan",{userId:uid,plan:p,expiry:e?e+"T00:00:00Z":"",days:d?parseInt(d):0}).then(r=>{if(r.success){closeModal();loadUsers()}else alert(r.error)})}';
  html += 'function toggleStatus(uid,st){var ns=st==="active"?"suspended":"active";if(!confirm("Set user to "+ns+"?"))return;api("admin_setUserStatus",{userId:uid,status:ns}).then(r=>{if(r.success)loadUsers();else alert(r.error)})}';
  html += 'function deleteUser(uid){if(!confirm("Permanently delete this user and all their data?"))return;api("admin_deleteUser",{userId:uid}).then(r=>{if(r.success)loadUsers();else alert(r.error)})}';
  // Payments
  html += 'function loadPayments(){api("admin_getAllPayments").then(r=>{if(!r.success)return;var p=r.payments;var h=\'<table><tr><th>UTR</th><th>User</th><th>Email</th><th>Amount</th><th>Plan</th><th>Status</th><th>Date</th><th>Actions</th></tr>\';';
  html += 'p.forEach(function(p){h+=\'<tr><td style="font-family:monospace">\'+p.utr+\'</td><td>\'+p.userName+\'</td><td>\'+p.userEmail+\'</td><td>\'+fmtINR(p.amount)+\'</td><td>\'+planBadge(p.requestedPlan)+\'</td><td>\'+statusBadge(p.status)+\'</td><td>\'+fmtDate(p.createdAt)+\'</td>\';';
  html += 'h+=\'<td>\';if(p.status==="pending"){h+=\'<button class="btn btn-success" onclick="approvePayment(\\\'\'+p.paymentId+\'\\\',\\\'\'+p.requestedPlan+\'\\\')">Approve</button> <button class="btn btn-danger" onclick="rejectPayment(\\\'\'+p.paymentId+\'\\\')">Reject</button>\'}';
  html += 'h+=\'</td></tr>\'});h+=\'</table>\';document.getElementById("panel-payments").innerHTML=h})}';
  html += 'function approvePayment(pid,plan){var days=prompt("Enter plan days to grant:",plan==="standard"?"30":"30");if(!days)return;api("admin_approvePayment",{paymentId:pid,planDays:parseInt(days)}).then(r=>{if(r.success)loadPayments();else alert(r.error)})}';
  html += 'function rejectPayment(pid){var reason=prompt("Rejection reason:");if(!reason)return;api("admin_rejectPayment",{paymentId:pid,reason:reason}).then(r=>{if(r.success)loadPayments();else alert(r.error)})}';
  // Tickets
  html += 'function loadTickets(){api("admin_getTickets").then(r=>{if(!r.success)return;var t=r.tickets;var h=t.length?\'<table><tr><th>Ticket ID</th><th>Email</th><th>UTR</th><th>Amount</th><th>Plan</th><th>Payment Date</th><th>Status</th><th>Actions</th></tr>\':\'<div class="empty">No open tickets</div>\';';
  html += 't.forEach(function(t){h+=\'<tr><td>\'+t.ticketId.substring(0,12)+\'...</td><td>\'+t.userEmail+\'</td><td style="font-family:monospace">\'+t.utr+\'</td><td>\'+fmtINR(t.amount)+\'</td><td>\'+planBadge(t.requestedPlan)+\'</td><td>\'+(t.paymentDate||"-")+\'</td><td>\'+statusBadge(t.status)+\'</td>\';';
  html += 'h+=\'<td>\';if(t.status==="open"){h+=\'<button class="btn btn-success" onclick="resolveTicket(\\\'\'+t.ticketId+\'\\\',\\\'approve\\\')">Approve & Resolve</button> <button class="btn btn-danger" onclick="resolveTicket(\\\'\'+t.ticketId+\'\\\',\\\'reject\\\')">Reject</button>\'}';
  html += 'h+=\'</td></tr>\'});if(t.length)h+=\'</table>\';document.getElementById("panel-tickets").innerHTML=h})}';
  html += 'function resolveTicket(tid,action){var days=action==="approve"?prompt("Plan days to grant:","30"):"0";if(action==="approve"&&!days)return;var reason=action==="reject"?prompt("Reason:",""):"Payment verified and plan activated.";api("admin_resolveTicket",{ticketId:tid,action:action,planDays:parseInt(days)||0,resolution:reason}).then(r=>{if(r.success)loadTickets();else alert(r.error)})}';
  // Referrals, Warranty, Contacts, Settings, Events, Broadcast (simplified)
  html += 'function loadReferrals(){api("admin_getReferrals").then(r=>{if(!r.success)return;var d=r.referrals;var h=\'<table><tr><th>Referrer</th><th>Referrer Email</th><th>Referred Email</th><th>Status</th><th>Date</th></tr>\';d.forEach(function(r){h+=\'<tr><td>\'+r.referrerName+\'</td><td>\'+r.referrerEmail+\'</td><td>\'+r.referredEmail+\'</td><td>\'+statusBadge(r.status)+\'</td><td>\'+fmtDate(r.createdAt)+\'</td></tr>\'});h+=\'</table>\';document.getElementById("panel-referrals").innerHTML=h||\'<div class="empty">No referrals</div>\'})}';
  html += 'function loadWarranty(){api("admin_getWarrantyClaims").then(r=>{if(!r.success)return;var c=r.claims;var h=c.length?\'<table><tr><th>Claim ID</th><th>Bill No</th><th>Customer</th><th>Phone</th><th>Issue</th><th>Status</th><th>Actions</th></tr>\':\'<div class="empty">No warranty claims</div>\';c.forEach(function(c){h+=\'<tr><td>\'+c.claimId.substring(0,12)+\'...</td><td>\'+c.billNumber+\'</td><td>\'+c.customerName+\'</td><td>\'+c.customerPhone+\'</td><td>\'+(c.issueDescription||"").substring(0,50)+\'...</td><td>\'+statusBadge(c.status)+\'</td><td>\'+(c.status==="open"?\'<button class="btn btn-primary" onclick="updateWarranty(\\\'\'+c.claimId+\'\\\')">Update</button>\':\'-\')+\'</td></tr>\'});if(c.length)h+=\'</table>\';document.getElementById("panel-warranty").innerHTML=h})}';
  html += 'function updateWarranty(cid){var s=prompt("Enter status (approved/rejected/in-progress):");if(!s)return;var n=prompt("Admin notes:","");api("admin_updateWarranty",{claimId:cid,status:s,notes:n}).then(r=>{if(r.success)loadWarranty();else alert(r.error)})}';
  html += 'function loadContacts(){api("admin_getContactForms").then(r=>{if(!r.success)return;var c=r.forms;var h=c.length?\'<table><tr><th>Name</th><th>Email</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr>\':\'<div class="empty">No contact submissions</div>\';c.forEach(function(c){h+=\'<tr><td>\'+c.userName+\'</td><td>\'+c.userEmail+\'</td><td>\'+(c.message||"").substring(0,80)+\'...</td><td>\'+statusBadge(c.status)+\'</td><td>\'+fmtDate(c.createdAt)+\'</td><td>\'+(c.status==="open"?\'<button class="btn btn-primary" onclick="replyContact(\\\'\'+c.formId+\'\\\')">Reply</button>\':\'-\')+\'</td></tr>\'});if(c.length)h+=\'</table>\';document.getElementById("panel-contacts").innerHTML=h})}';
  html += 'function replyContact(fid){var r=prompt("Reply message:");if(!r)return;api("admin_replyContact",{formId:fid,reply:r}).then(r=>{if(r.success)loadContacts();else alert(r.error)})}';
  html += 'function loadSettings(){api("admin_getSettings").then(r=>{if(!r.success)return;var s=r.settings;var h=\'<div style="max-width:500px">\';h+=\'<label style="display:block;font-size:13px;color:#8b949e;margin-bottom:4px">UPI ID</label><input class="input" id="sUpi" style="width:100%;margin-bottom:16px" value="\'+(s.upiId||"")+\'">\';h+=\'<label style="display:block;font-size:13px;color:#8b949e;margin-bottom:4px">QR Image URL</label><input class="input" id="sQr" style="width:100%;margin-bottom:16px" value="\'+(s.qrUrl||"")+\'">\';h+=\'<label style="display:block;font-size:13px;color:#8b949e;margin-bottom:4px">WhatsApp Footer Text</label><input class="input" id="sWhatsapp" style="width:100%;margin-bottom:16px" value="\'+(s.whatsappFooter||"")+\'">\';h+=\'<label style="display:block;font-size:13px;color:#8b949e;margin-bottom:4px">Maintenance Mode</label><select class="select" id="sMaint" style="width:100%;margin-bottom:16px"><option value="false"\'+(s.maintenance!=="true"?" selected":"")+\'">Off</option><option value="true"\'+(s.maintenance==="true"?" selected":"")+\'">On</option></select>\';h+=\'<label style="display:block;font-size:13px;color:#8b949e;margin-bottom:4px">Maintenance Message</label><input class="input" id="sMaintMsg" style="width:100%;margin-bottom:16px" value="\'+(s.maintenanceMessage||"")+\'">\';h+=\'<button class="btn btn-primary" onclick="saveSettings()">Save Settings</button></div>\';document.getElementById("panel-settings").innerHTML=h})}';
  html += 'function saveSettings(){api("admin_updateSettings",{upiId:document.getElementById("sUpi").value,qrUrl:document.getElementById("sQr").value,whatsappFooter:document.getElementById("sWhatsapp").value,maintenance:document.getElementById("sMaint").value,maintenanceMessage:document.getElementById("sMaintMsg").value}).then(r=>{if(r.success)alert("Settings saved!");else alert(r.error)})}';
  html += 'function loadEvents(){api("admin_getEvents").then(r=>{if(!r.success)return;var e=r.events;var h=e.length?\'<table><tr><th>Event</th><th>Type</th><th>Target User</th><th>Reward</th><th>Status</th><th>Date</th><th>Actions</th></tr>\':\'<div class="empty">No events logged</div>\';e.forEach(function(e){h+=\'<tr><td>\'+e.eventName+\'</td><td>\'+e.eventType+\'</td><td>\'+(e.targetUserId||"All")+\'</td><td>\'+e.rewardDetail+\'</td><td>\'+statusBadge(e.status)+\'</td><td>\'+fmtDate(e.createdAt)+\'</td><td>\'+(e.status==="scheduled"?\'<button class="btn btn-primary" onclick="triggerEvent(\\\'\'+e.eventId+\'\\\')">Trigger</button>\':\'-\')+\'</td></tr>\'});if(e.length)h+=\'</table>\';document.getElementById("panel-events").innerHTML=h})}';
  html += 'function triggerEvent(eid){if(!confirm("Manually trigger this event?"))return;api("admin_triggerEvent",{eventId:eid}).then(r=>{if(r.success)loadEvents();else alert(r.error)})}';
  html += 'function loadBroadcast(){api("admin_getSettings").then(r=>{if(!r.success)return;var s=r.settings;var h=\'<div style="max-width:500px"><h3 style="color:#f0f6fc;margin-bottom:16px">Broadcast to All Users</h3>\';h+=\'<label style="display:block;font-size:13px;color:#8b949e;margin-bottom:4px">Message</label><textarea class="input" id="bcMsg" style="width:100%;height:80px;margin-bottom:12px">\'+(s._broadcastMsg||"")+\'</textarea>\';h+=\'<label style="display:block;font-size:13px;color:#8b949e;margin-bottom:4px">Link (optional)</label><input class="input" id="bcLink" style="width:100%;margin-bottom:16px" value="\'+(s._broadcastLink||"")+\'">\';h+=\'<div style="display:flex;gap:8px"><button class="btn btn-primary" onclick="sendBroadcast()">Send Broadcast</button>\';if(s._broadcastActive==="true")h+=\'<button class="btn btn-danger" onclick="clearBroadcast()">Clear Active</button>\';h+=\'</div></div>\';document.getElementById("panel-broadcast").innerHTML=h})}';
  html += 'function sendBroadcast(){var m=document.getElementById("bcMsg").value;if(!m){alert("Message required");return}var l=document.getElementById("bcLink").value;api("admin_updateSettings",{broadcastMsg:m,broadcastLink:l,broadcastActive:"true"}).then(r=>{if(r.success)alert("Broadcast sent!");else alert(r.error)})}';
  html += 'function clearBroadcast(){api("admin_updateSettings",{broadcastActive:"false"}).then(r=>{if(r.success)loadBroadcast();else alert(r.error)})}';
  html += 'init();';
  html += '</script></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('LumiBooks Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ═══════════════════════════════════════
// ADMIN doPost ROUTER
// ═══════════════════════════════════════
function adminDoPost(action, params) {
  // All admin actions require admin session
  var adminId = _requireAdminAuth(params);
  if (!adminId) return jsonResponse({ success: false, error: 'Admin session expired.' });

  try {
    if (action === 'admin_login') return adminLogin(params); // handled separately
    if (action === 'admin_validate') return adminValidate(params);
    if (action === 'admin_logout') return adminLogout(params);
    if (action === 'admin_getDashboard') return adminGetDashboard(params);
    if (action === 'admin_getUsers') return adminGetUsers(params);
    if (action === 'admin_setUserStatus') return adminSetUserStatus(params);
    if (action === 'admin_setUserPlan') return adminSetUserPlan(params);
    if (action === 'admin_deleteUser') return adminDeleteUser(params);
    if (action === 'admin_getAllPayments') return adminGetAllPayments(params);
    if (action === 'admin_approvePayment') return adminApprovePayment(params);
    if (action === 'admin_rejectPayment') return adminRejectPayment(params);
    if (action === 'admin_getTickets') return adminGetTickets(params);
    if (action === 'admin_resolveTicket') return adminResolveTicket(params);
    if (action === 'admin_getReferrals') return adminGetReferrals(params);
    if (action === 'admin_getWarrantyClaims') return adminGetWarrantyClaims(params);
    if (action === 'admin_updateWarranty') return adminUpdateWarranty(params);
    if (action === 'admin_getContactForms') return adminGetContactForms(params);
    if (action === 'admin_replyContact') return adminReplyContact(params);
    if (action === 'admin_getSettings') return adminGetSettings(params);
    if (action === 'admin_updateSettings') return adminUpdateSettings(params);
    if (action === 'admin_getEvents') return adminGetEvents(params);
    if (action === 'admin_triggerEvent') return adminTriggerEvent(params);

    return jsonResponse({ success: false, error: 'Unknown admin action.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

// ═══════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════
function adminLogin(params) {
  try {
    var username = sanitize(params.username);
    var password = params.password;

    // Admin credentials stored in AppSettings tab
    var adminHash = getAppSetting('admin_password_hash');
    var adminSalt = getAppSetting('admin_password_salt');
    var adminUser = getAppSetting('admin_username');

    if (!adminHash || !adminSalt) {
      // First-time setup: create admin with provided credentials
      if (!username || !password) return jsonResponse({ success: false, error: 'Username and password required.' });
      var salt = generateSalt();
      var hash = hashPassword(password, salt);
      setAppSetting('admin_username', username);
      setAppSetting('admin_password_hash', hash);
      setAppSetting('admin_password_salt', salt);

      var token = generateToken('ADMSESS_');
      var expiresAt = new Date(Date.now() + SESSION_EXPIRY_ADMIN_MS).toISOString();
      var sessionTab = getMasterTab(TAB_SESSIONS);
      sessionTab.appendRow([token, 'ADMIN', new Date().toISOString(), expiresAt, 'admin']);

      _logAudit(token, 'ADMIN_FIRST_SETUP', '', 'Admin account created');
      return jsonResponse({ success: true, token: token });
    }

    if (username !== adminUser) return jsonResponse({ success: false, error: 'Invalid credentials.' });
    if (hashPassword(password, adminSalt) !== adminHash) return jsonResponse({ success: false, error: 'Invalid credentials.' });

    var token = generateToken('ADMSESS_');
    var expiresAt = new Date(Date.now() + SESSION_EXPIRY_ADMIN_MS).toISOString();
    var sessionTab = getMasterTab(TAB_SESSIONS);
    sessionTab.appendRow([token, 'ADMIN', new Date().toISOString(), expiresAt, 'admin']);

    _logAudit(token, 'ADMIN_LOGIN', '', 'Admin logged in');
    return jsonResponse({ success: true, token: token });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong.' });
  }
}

function adminValidate(params) {
  var adminId = _requireAdminAuth(params);
  if (!adminId) return jsonResponse({ success: false, error: 'Invalid session.' });
  return jsonResponse({ success: true });
}

function adminLogout(params) {
  var token = sanitize(params.token);
  var sessionTab = getMasterTab(TAB_SESSIONS);
  var data = sessionTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][4] === 'admin') {
      sessionTab.deleteRow(i + 1);
      break;
    }
  }
  return jsonResponse({ success: true });
}

function _requireAdminAuth(params) {
  var token = sanitize(params.token);
  if (!token || token.indexOf('ADMSESS_') !== 0) return null;

  var sessionTab = getMasterTab(TAB_SESSIONS);
  var data = sessionTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][4] === 'admin') {
      if (new Date(data[i][3]).getTime() > Date.now()) return 'ADMIN';
      sessionTab.deleteRow(i + 1);
      return null;
    }
  }
  return null;
}

function _logAudit(token, action, targetUserId, details) {
  var auditTab = getMasterTab(TAB_AUDIT);
  auditTab.appendRow([new Date().toISOString(), hashString(token || ''), action, targetUserId, details]);
}

// ═══════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════
function adminGetDashboard(params) {
  var userTab = getMasterTab(TAB_USERS);
  var sessionTab = getMasterTab(TAB_SESSIONS);
  var payTab = getMasterTab(TAB_PAYMENTS);
  var ticketTab = getMasterTab(TAB_TICKETS);
  var now = new Date();

  var uData = userTab.getDataRange().getValues();
  var totalUsers = 0, activeSessions = 0, pendingPayments = 0, revenueMTD = 0, newUsersMTD = 0, planDist = {};

  for (var i = 1; i < uData.length; i++) {
    totalUsers++;
    var p = String(uData[i][6]).toLowerCase();
    planDist[p] = (planDist[p] || 0) + 1;
    var created = new Date(uData[i][13]);
    if (created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) newUsersMTD++;
  }

  var sData = sessionTab.getDataRange().getValues();
  for (var j = 1; j < sData.length; j++) {
    if (new Date(sData[j][3]).getTime() > Date.now()) activeSessions++;
  }

  var pData = payTab.getDataRange().getValues();
  for (var k = 1; k < pData.length; k++) {
    if (pData[k][5] === 'pending') pendingPayments++;
    if (pData[k][5] === 'approved') {
      var pd = new Date(pData[k][7]);
      if (pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear()) revenueMTD += parseFloat(pData[k][3]) || 0;
    }
  }

  var openTickets = 0;
  var tData = ticketTab.getDataRange().getValues();
  for (var m = 1; m < tData.length; m++) {
    if (tData[m][8] === 'open') openTickets++;
  }

  return jsonResponse({
    success: true,
    data: { totalUsers: totalUsers, activeSessions: activeSessions, pendingPayments: pendingPayments, revenueMTD: revenueMTD, newUsersMTD: newUsersMTD, openTickets: openTickets, planDist: planDist }
  });
}

// ═══════════════════════════════════════
// ADMIN USER MANAGEMENT
// ═══════════════════════════════════════
function adminGetUsers(params) {
  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    users.push({
      userId: data[i][0], name: data[i][1], email: data[i][2], phone: data[i][3],
      plan: data[i][6], premiumExpiry: data[i][7], status: data[i][10], createdAt: data[i][13]
    });
  }
  return jsonResponse({ success: true, users: users });
}

function adminSetUserStatus(params) {
  var userId = sanitize(params.userId);
  var status = sanitize(params.status);
  if (!userId || !['active', 'suspended'].indexOf(status)) return jsonResponse({ success: false, error: 'Invalid parameters.' });

  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      userTab.getRange(i + 1, 11).setValue(status);
      _logAudit(params.token, 'SET_USER_STATUS', userId, 'Set to ' + status);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'User not found.' });
}

function adminSetUserPlan(params) {
  var userId = sanitize(params.userId);
  var plan = sanitize(params.plan);
  var expiry = params.expiry || '';
  var days = parseInt(params.days) || 0;

  if (!userId || !PLANS[plan]) return jsonResponse({ success: false, error: 'Invalid parameters.' });

  var userTab = getMasterTab(TAB_USERS);
  var data = userTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      var finalExpiry = expiry;
      if (days > 0) {
        var baseDate = new Date();
        if (data[i][7]) {
          var curExp = new Date(data[i][7]);
          if (curExp > baseDate) baseDate = curExp;
        }
        finalExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      userTab.getRange(i + 1, 7, 1, 2).setValues([[plan, finalExpiry]]);
      _logAudit(params.token, 'SET_USER_PLAN', userId, 'Plan=' + plan + ', Expiry=' + finalExpiry + ', Days=' + days);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'User not found.' });
}

function adminDeleteUser(params) {
  var userId = sanitize(params.userId);
  if (!userId) return jsonResponse({ success: false, error: 'User ID required.' });

  // Delete user folder
  var folder = getUserFolder(userId);
  if (folder) {
    var files = folder.getFiles();
    while (files.hasNext()) files.next().setTrashed(true);
    folder.setTrashed(true);
  }

  // Delete user sessions
  var sessionTab = getMasterTab(TAB_SESSIONS);
  var sData = sessionTab.getDataRange().getValues();
  for (var s = sData.length - 1; s >= 1; s--) {
    if (sData[s][1] === userId) sessionTab.deleteRow(s + 1);
  }

  // Delete user record
  var userTab = getMasterTab(TAB_USERS);
  var uData = userTab.getDataRange().getValues();
  for (var u = 1; u < uData.length; u++) {
    if (uData[u][0] === userId) {
      userTab.deleteRow(u + 1);
      break;
    }
  }

  _logAudit(params.token, 'DELETE_USER', userId, 'User and all data deleted');
  return jsonResponse({ success: true });
}

// ═══════════════════════════════════════
// ADMIN PAYMENT MANAGEMENT
// ═══════════════════════════════════════
function adminGetAllPayments(params) {
  var payTab = getMasterTab(TAB_PAYMENTS);
  var data = payTab.getDataRange().getValues();
  var userTab = getMasterTab(TAB_USERS);
  var uData = userTab.getDataRange().getValues();
  var userMap = {};
  for (var u = 1; u < uData.length; u++) userMap[uData[u][0]] = { name: uData[u][1], email: uData[u][2] };

  var payments = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var um = userMap[data[i][1]] || { name: 'Unknown', email: '-' };
    payments.push({
      paymentId: data[i][0], userId: data[i][1], utr: data[i][2], amount: data[i][3],
      requestedPlan: data[i][4], status: data[i][5], createdAt: data[i][6],
      verifiedAt: data[i][7], rejectReason: data[i][9],
      userName: um.name, userEmail: um.email
    });
  }
  return jsonResponse({ success: true, payments: payments });
}

function adminApprovePayment(params) {
  var paymentId = sanitize(params.paymentId);
  var planDays = parseInt(params.planDays) || 30;
  if (!paymentId) return jsonResponse({ success: false, error: 'Payment ID required.' });

  var payTab = getMasterTab(TAB_PAYMENTS);
  var data = payTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === paymentId) {
      var userId = data[i][1];
      var plan = data[i][4] || 'premium';
      payTab.getRange(i + 1, 6).setValue('approved');
      payTab.getRange(i + 1, 8).setValue(new Date().toISOString());
      payTab.getRange(i + 1, 10).setValue(planDays);
      grantPremiumDays(userId, planDays, 'Payment approved: ' + paymentId);
      _logAudit(params.token, 'APPROVE_PAYMENT', userId, 'Payment=' + paymentId + ', Days=' + planDays);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Payment not found.' });
}

function adminRejectPayment(params) {
  var paymentId = sanitize(params.paymentId);
  var reason = sanitize(params.reason);
  if (!paymentId) return jsonResponse({ success: false, error: 'Payment ID required.' });

  var payTab = getMasterTab(TAB_PAYMENTS);
  var data = payTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === paymentId) {
      payTab.getRange(i + 1, 6).setValue('rejected');
      payTab.getRange(i + 1, 9).setValue(reason);
      _logAudit(params.token, 'REJECT_PAYMENT', data[i][1], 'Payment=' + paymentId + ', Reason=' + reason);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Payment not found.' });
}

// ═══════════════════════════════════════
// ADMIN TICKETS
// ═══════════════════════════════════════
function adminGetTickets(params) {
  var ticketTab = getMasterTab(TAB_TICKETS);
  var data = ticketTab.getDataRange().getValues();
  var tickets = [];
  for (var i = data.length - 1; i >= 1; i--) {
    tickets.push({
      ticketId: data[i][0], userId: data[i][1], userEmail: data[i][2],
      utr: data[i][3], amount: data[i][4], requestedPlan: data[i][5],
      paymentDate: data[i][6], description: data[i][7], status: data[i][8],
      resolution: data[i][9], createdAt: data[i][10]
    });
  }
  return jsonResponse({ success: true, tickets: tickets });
}

function adminResolveTicket(params) {
  var ticketId = sanitize(params.ticketId);
  var action = sanitize(params.action);
  var planDays = parseInt(params.planDays) || 0;
  var resolution = sanitize(params.resolution);
  if (!ticketId) return jsonResponse({ success: false, error: 'Ticket ID required.' });

  var ticketTab = getMasterTab(TAB_TICKETS);
  var data = ticketTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === ticketId) {
      var status = action === 'approve' ? 'approved' : 'rejected';
      ticketTab.getRange(i + 1, 9).setValue(status);
      ticketTab.getRange(i + 1, 10).setValue(resolution);
      ticketTab.getRange(i + 1, 12).setValue(new Date().toISOString());

      if (action === 'approve' && planDays > 0) {
        var userId = data[i][1];
        var plan = data[i][5] || 'premium';
        grantPremiumDays(userId, planDays, 'Ticket approved: ' + ticketId);
      }

      _logAudit(params.token, 'RESOLVE_TICKET', data[i][1], 'Ticket=' + ticketId + ', Action=' + action);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Ticket not found.' });
}

// ═══════════════════════════════════════
// ADMIN REFERRALS, WARRANTY, CONTACTS
// ═══════════════════════════════════════
function adminGetReferrals(params) {
  var refTab = getMasterTab(TAB_REFERRALS);
  var userTab = getMasterTab(TAB_USERS);
  var uData = userTab.getDataRange().getValues();
  var userMap = {};
  for (var u = 1; u < uData.length; u++) userMap[uData[u][0]] = { name: uData[u][1], email: uData[u][2] };

  var data = refTab.getDataRange().getValues();
  var referrals = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var ref = userMap[data[i][0]] || { name: 'Unknown', email: '-' };
    referrals.push({
      referrerId: data[i][0], referrerName: ref.name, referrerEmail: ref.email,
      referredEmail: data[i][2], status: data[i][3], createdAt: data[i][4]
    });
  }
  return jsonResponse({ success: true, referrals: referrals });
}

function adminGetWarrantyClaims(params) {
  var userTab = getMasterTab(TAB_USERS);
  var uData = userTab.getDataRange().getValues();
  var claims = [];
  for (var u = 1; u < uData.length; u++) {
    var userId = uData[u][0];
    var wTab = getUserTab(userId, UTAB_WARRANTY);
    if (!wTab) continue;
    var wData = wTab.getDataRange().getValues();
    for (var i = 1; i < wData.length; i++) {
      claims.push({
        userId: userId, claimId: wData[i][0], billId: wData[i][1],
        billNumber: wData[i][2], customerName: wData[i][3], customerPhone: wData[i][4],
        issueDescription: wData[i][5], status: wData[i][6], adminNotes: wData[i][7],
        createdAt: wData[i][8]
      });
    }
  }
  return jsonResponse({ success: true, claims: claims });
}

function adminUpdateWarranty(params) {
  var claimId = sanitize(params.claimId);
  var status = sanitize(params.status);
  var notes = sanitize(params.notes);
  if (!claimId) return jsonResponse({ success: false, error: 'Claim ID required.' });

  var userTab = getMasterTab(TAB_USERS);
  var uData = userTab.getDataRange().getValues();
  for (var u = 1; u < uData.length; u++) {
    var wTab = getUserTab(uData[u][0], UTAB_WARRANTY);
    if (!wTab) continue;
    var wData = wTab.getDataRange().getValues();
    for (var i = 1; i < wData.length; i++) {
      if (wData[i][0] === claimId) {
        wTab.getRange(i + 1, 7).setValue(status);
        wTab.getRange(i + 1, 8).setValue(notes);
        return jsonResponse({ success: true });
      }
    }
  }
  return jsonResponse({ success: false, error: 'Claim not found.' });
}

function adminGetContactForms(params) {
  var contactTab = getMasterTab(TAB_CONTACTS);
  var data = contactTab.getDataRange().getValues();
  var forms = [];
  for (var i = data.length - 1; i >= 1; i--) {
    forms.push({
      formId: data[i][0], userName: data[i][2], userEmail: data[i][3],
      message: data[i][4], status: data[i][5], reply: data[i][6], createdAt: data[i][7]
    });
  }
  return jsonResponse({ success: true, forms: forms });
}

function adminReplyContact(params) {
  var formId = sanitize(params.formId);
  var reply = sanitize(params.reply);
  if (!formId || !reply) return jsonResponse({ success: false, error: 'All fields required.' });

  var contactTab = getMasterTab(TAB_CONTACTS);
  var data = contactTab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === formId) {
      contactTab.getRange(i + 1, 6).setValue('resolved');
      contactTab.getRange(i + 1, 7).setValue(reply);
      // Send email reply
      var email = data[i][3];
      if (email) {
        MailApp.sendEmail(email, 'Re: Your LumiBooks Inquiry', 'Hello,\n\n' + reply + '\n\nLumiBooks Team\nLumineerCo');
      }
      _logAudit(params.token, 'REPLY_CONTACT', '', 'Form=' + formId);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Form not found.' });
}

// ═══════════════════════════════════════
// ADMIN SETTINGS
// ═══════════════════════════════════════
function adminGetSettings(params) {
  return jsonResponse({
    success: true,
    settings: {
      upiId: getAppSetting('upi_id') || UPI_ID,
      qrUrl: getAppSetting('qr_url') || '',
      whatsappFooter: getAppSetting('whatsapp_footer') || '',
      maintenance: getAppSetting('maintenance_mode') || 'false',
      maintenanceMessage: getAppSetting('maintenance_message') || '',
      _broadcastMsg: getAppSetting('broadcast_msg') || '',
      _broadcastLink: getAppSetting('broadcast_link') || '',
      _broadcastActive: getAppSetting('broadcast_active') || 'false'
    }
  });
}

function adminUpdateSettings(params) {
  if (params.upiId !== undefined) setAppSetting('upi_id', sanitize(params.upiId));
  if (params.qrUrl !== undefined) setAppSetting('qr_url', sanitize(params.qrUrl));
  if (params.whatsappFooter !== undefined) setAppSetting('whatsapp_footer', sanitize(params.whatsappFooter));
  if (params.maintenance !== undefined) setAppSetting('maintenance_mode', sanitize(params.maintenance));
  if (params.maintenanceMessage !== undefined) setAppSetting('maintenance_message', sanitize(params.maintenanceMessage));

  // Broadcast
  if (params.broadcastMsg !== undefined) setAppSetting('broadcast_msg', sanitize(params.broadcastMsg));
  if (params.broadcastLink !== undefined) setAppSetting('broadcast_link', sanitize(params.broadcastLink));
  if (params.broadcastActive !== undefined) {
    setAppSetting('broadcast_active', sanitize(params.broadcastActive));
    if (params.broadcastActive === 'true') {
      setAppSetting('broadcast_created', new Date().toISOString());
    } else {
      setAppSetting('broadcast_cleared', new Date().toISOString());
    }
  }

  _logAudit(params.token, 'UPDATE_SETTINGS', '', JSON.stringify(params));
  return jsonResponse({ success: true });
}

// ═══════════════════════════════════════
// ADMIN EVENTS
// ═══════════════════════════════════════
function adminGetEvents(params) {
  var eventTab = getMasterTab(TAB_EVENTS);
  var data = eventTab.getDataRange().getValues();
  var events = [];
  for (var i = data.length - 1; i >= 1; i--) {
    events.push({
      eventId: data[i][0], eventType: data[i][1], eventName: data[i][2],
      targetUserId: data[i][3], reward: data[i][4], rewardDetail: data[i][5],
      status: data[i][6], createdAt: data[i][7]
    });
  }
  return jsonResponse({ success: true, events: events });
}

function adminTriggerEvent(params) {
  var eventId = sanitize(params.eventId);
  if (!eventId) return jsonResponse({ success: false, error: 'Event ID required.' });

  // Re-run the event engine for this specific event
  try {
    runMonthlyEvents();
    _logAudit(params.token, 'TRIGGER_EVENT', '', 'Event=' + eventId);
    return jsonResponse({ success: true, message: 'Event triggered.' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Failed to trigger event.' });
  }
}
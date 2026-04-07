/**
 * Export.gs — LumiBooks v3
 * PDF & DOC generation from bills (Premium only).
 * Uses Google Docs as template engine → export as PDF/DOC.
 */

function generatePDF(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var planConfig = getUserPlanConfig(userId);
    if (!planConfig.hasPDF) return jsonResponse({ success: false, error: 'PDF download is available on Premium plan and above.' });

    var billId = sanitize(params.billId);
    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();
    var row = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === billId) { row = i; break; }
    }
    if (row === -1) return jsonResponse({ success: false, error: 'Bill not found.' });

    var profileTab = getUserTab(userId, UTAB_PROFILE);
    var profile = {};
    if (profileTab) {
      var pData = profileTab.getDataRange().getValues();
      for (var p = 1; p < pData.length; p++) profile[pData[p][0]] = pData[p][1];
    }

    var items = [];
    try { items = JSON.parse(data[row][7]); } catch (e) { items = []; }

    var docContent = _buildDoc(data[row], items, profile);
    var doc = DocumentApp.create('Bill_' + data[row][1]);
    var body = doc.getBody();
    body.setText(docContent.plainText);

    // Add formatted content
    if (docContent.title) body.appendParagraph(docContent.title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    if (docContent.subtitle) body.appendParagraph(docContent.subtitle);

    for (var j = 0; j < docContent.paragraphs.length; j++) {
      body.appendParagraph(docContent.paragraphs[j]);
    }

    if (docContent.tableRows && docContent.tableRows.length > 0) {
      var table = body.appendTable(docContent.tableRows);
      table.setBorderWidth(1);
    }

    // Export as PDF
    var pdfBlob = doc.getBlob().getAs('application/pdf');
    doc.setName('Bill_' + data[row][1] + '_PDF');

    // Clean up — move to user folder then delete temp doc
    var folder = getUserFolder(userId);
    if (folder) {
      var tempFile = DriveApp.getFileById(doc.getId());
      DriveApp.Files.move(tempFile, folder);
    }

    return jsonResponse({
      success: true,
      downloadUrl: 'https://drive.google.com/file/d/' + doc.getId() + '/view',
      message: 'PDF generated successfully.'
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

function generateDOC(params) {
  var userId = _requireAuth(params);
  if (!userId) return jsonResponse({ success: false, error: 'Session expired.' });

  try {
    var planConfig = getUserPlanConfig(userId);
    if (!planConfig.hasPDF) return jsonResponse({ success: false, error: 'DOC download is available on Premium plan and above.' });

    var billId = sanitize(params.billId);
    var billTab = getUserTab(userId, UTAB_BILLS);
    var data = billTab.getDataRange().getValues();
    var row = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === billId) { row = i; break; }
    }
    if (row === -1) return jsonResponse({ success: false, error: 'Bill not found.' });

    var profileTab = getUserTab(userId, UTAB_PROFILE);
    var profile = {};
    if (profileTab) {
      var pData = profileTab.getDataRange().getValues();
      for (var p = 1; p < pData.length; p++) profile[pData[p][0]] = pData[p][1];
    }

    var items = [];
    try { items = JSON.parse(data[row][7]); } catch (e) { items = []; }

    var docContent = _buildDoc(data[row], items, profile);
    var doc = DocumentApp.create('Bill_' + data[row][1]);
    var body = doc.getBody();

    if (docContent.title) body.appendParagraph(docContent.title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    if (docContent.subtitle) body.appendParagraph(docContent.subtitle);

    for (var j = 0; j < docContent.paragraphs.length; j++) {
      body.appendParagraph(docContent.paragraphs[j]);
    }

    if (docContent.tableRows && docContent.tableRows.length > 0) {
      var table = body.appendTable(docContent.tableRows);
      table.setBorderWidth(1);
    }

    var folder = getUserFolder(userId);
    if (folder) {
      var tempFile = DriveApp.getFileById(doc.getId());
      DriveApp.Files.move(tempFile, folder);
    }

    return jsonResponse({
      success: true,
      downloadUrl: 'https://drive.google.com/file/d/' + doc.getId() + '/view',
      message: 'Document generated successfully.'
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again.' });
  }
}

function _buildDoc(billRow, items, profile) {
  var bizName = profile.businessName || 'My Business';
  var bizAddr = profile.address || '';
  var bizPhone = profile.phone || '';
  var bizGST = profile.gstIn || '';

  var title = bizName;
  var subtitle = 'TAX INVOICE';
  var paragraphs = [];
  var tableRows = [];

  paragraphs.push('Bill No: ' + billRow[1] + '    Date: ' + billRow[2]);
  paragraphs.push('');
  paragraphs.push('Customer: ' + (billRow[3] || 'N/A'));
  if (billRow[5]) paragraphs.push('Customer GSTIN: ' + billRow[5]);
  if (billRow[6]) paragraphs.push('Address: ' + billRow[6]);
  paragraphs.push('');

  // Items table header
  tableRows.push(['#', 'Item', 'Qty', 'Price', 'Total']);
  for (var i = 0; i < items.length; i++) {
    tableRows.push([
      String(i + 1),
      items[i].name || 'Item',
      String(items[i].quantity || 0),
      '₹' + (items[i].price || 0),
      '₹' + (items[i].total || 0)
    ]);
  }

  paragraphs.push('');
  paragraphs.push('Subtotal: ₹' + billRow[8]);
  if (parseFloat(billRow[11]) > 0) paragraphs.push('CGST: ₹' + billRow[11]);
  if (parseFloat(billRow[12]) > 0) paragraphs.push('SGST: ₹' + billRow[12]);
  if (parseFloat(billRow[13]) > 0) paragraphs.push('IGST: ₹' + billRow[13]);
  paragraphs.push('TOTAL: ₹' + billRow[14]);
  paragraphs.push('');
  if (billRow[19]) paragraphs.push('Warranty: ' + (billRow[20] || 'As per policy'));
  if (billRow[21]) paragraphs.push('Notes: ' + billRow[21]);
  paragraphs.push('');
  paragraphs.push('Generated by LumiBooks — LumineerCo');

  var plainText = title + '\n' + subtitle + '\n' + paragraphs.join('\n');
  return { title: title, subtitle: subtitle, paragraphs: paragraphs, tableRows: tableRows, plainText: plainText };
}
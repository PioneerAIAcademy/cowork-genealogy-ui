/**
 * Research Viewer — Feedback Endpoint
 *
 * A Google Apps Script web app that receives feedback POSTs from the
 * Electron Research Viewer and saves each payload as a JSON file in
 * a Google Drive folder.
 *
 * Setup:
 *   1. Create a Google Drive folder for feedback storage
 *   2. Set FOLDER_ID below to that folder's ID
 *   3. Optionally set NOTIFICATION_EMAIL to receive alerts
 *   4. Deploy as web app (Execute as: me, Access: anyone)
 */

// ── Configuration ──────────────────────────────────────────────────
// Google Drive folder ID where feedback JSON files will be saved.
// Find this in the folder's URL: drive.google.com/drive/folders/<THIS_ID>
var FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

// Optional: email address to notify on new feedback. Leave empty to disable.
var NOTIFICATION_EMAIL = '';

// ── Endpoint ───────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    var folder = DriveApp.getFolderById(FOLDER_ID);

    // Build a descriptive filename: feedback-2026-05-06T14-30-00Z.json
    var timestamp = payload.timestamp || new Date().toISOString();
    var safeTimestamp = timestamp.replace(/[:.]/g, '-');
    var filename = 'feedback-' + safeTimestamp + '.json';

    // Pretty-print the JSON for easy reading
    var content = JSON.stringify(payload, null, 2);
    var file = folder.createFile(filename, content, 'application/json');

    // Build a short summary for notifications
    var sizeParts = [];
    if (payload.research) sizeParts.push('research');
    if (payload.gedcomx) sizeParts.push('gedcomx');
    if (payload.userComment) sizeParts.push('comment');
    var summary = 'Includes: ' + (sizeParts.length > 0 ? sizeParts.join(', ') : 'empty');
    var sizeKB = Math.round(content.length / 1024);

    // Send email notification if configured
    if (NOTIFICATION_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: 'New Research Viewer Feedback (' + sizeKB + ' KB)',
        body: 'New feedback received.\n\n'
            + summary + '\n'
            + 'Size: ' + sizeKB + ' KB\n'
            + 'Project folder: ' + (payload.projectFolder || 'unknown') + '\n'
            + 'Viewer version: ' + (payload.viewerVersion || 'unknown') + '\n'
            + 'User comment: ' + (payload.userComment || '(none)') + '\n\n'
            + 'File: ' + file.getUrl()
      });
    }

    // Log for Apps Script dashboard
    Logger.log('Saved feedback: ' + filename + ' (' + sizeKB + ' KB)');

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, filename: filename }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('Error processing feedback: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle CORS preflight from Electron (not strictly needed for
// Apps Script web apps, but included for safety)
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Feedback endpoint is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

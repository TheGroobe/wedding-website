// ============================================================
// Wedding RSVP backend -- Google Apps Script
// Runs on Alex's EXISTING personal Google account (never a throwaway:
// new accounts deploying web apps + sending mail trip Google's abuse
// detection and can be suspended mid-RSVP-window, locking the data).
// ============================================================

// ---- CONFIG: fill these two in before deploying ----
var SHEET_ID = 'PASTE_SHEET_ID_HERE';        // from the Sheet URL (Task 3)
var NOTIFY_EMAIL = 'awgrube@gmail.com';       // where notifications go (must match what you set in the DEPLOYED copy)
var MAX_SUBMISSIONS = 150;                    // submission cap (~100 guests + margin)
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzbGhyVR3FiaieY2UerRWDaaKYw1XUYkf2OHt2VOL0OVXFnO0XDLP0ILLbrgkDyjsax/exec'; // used by the weekly heartbeat self-test

var VALID_AIRPORTS = ['IXE', 'OTHER', 'NOT_SURE']; // IXE is the designated airport for all guests; OTHER = tell us on WhatsApp

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // wait up to 10s for concurrent submissions
  } catch (err) {
    return jsonOut({ ok: false, message: 'The line is busy -- please tap Send again in a few seconds.' });
  }
  try {
    var p = (e && e.parameter) || {};

    // Honeypot: bots fill the hidden "website" field. Pretend success, store nothing.
    // (The weekly heartbeat also uses this path as a zero-pollution self-test.)
    if (p.website) {
      return jsonOut({ ok: true, message: 'Thank you!' });
    }

    var v = validate(p);
    if (v.errors.length) {
      return jsonOut({ ok: false, message: 'Please check: ' + v.errors.join('; ') });
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var log = ss.getSheetByName('Log');

    // Submission cap (abuse protection; Log row 1 is the header)
    if (log.getLastRow() - 1 >= MAX_SUBMISSIONS) {
      return jsonOut({ ok: false, message: 'RSVPs are closed online -- please WhatsApp us and we will add you by hand.' });
    }

    // APPEND-ONLY, by header lookup (never positional, never overwrite)
    var headers = log.getRange(1, 1, 1, log.getLastColumn()).getValues()[0];
    var record = {
      timestamp: new Date(),
      name: v.name,
      email: v.email,
      attending: v.attending,
      party_size: v.partySize,
      party_names: v.partyNames,
      dietary_restrictions: v.dietary,
      allergies: v.allergies,
      arrival_airport: v.airport,
      arrival_date: v.arrivalDate,
      flight_number: v.flightNumber,
      departure_date: v.departureDate,
      user_agent: String(p.ua || '').slice(0, 200)
    };
    log.appendRow(headers.map(function (h) {
      return (h in record) ? record[h] : '';
    }));

    notifyAlex(record); // per-submission email (T4); never blocks the guest

    return jsonOut({ ok: true, message: 'RSVP received -- thank you!' });
  } catch (err) {
    try {
      MailApp.sendEmail(NOTIFY_EMAIL, '[Wedding RSVP] ERROR in doPost',
        'A submission FAILED at ' + new Date() + '\n\n' + (err && err.stack || err) +
        '\n\nPayload: ' + JSON.stringify((e && e.parameter) || {}));
    } catch (ignore) {}
    return jsonOut({ ok: false, message: 'Something went wrong on our end. Please try again -- or WhatsApp us and we will record it by hand.' });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut(obj) {
  // ContentService JSON on an "Anyone" web app is CORS-readable by the
  // static site (simple request, no preflight). Frontend must NOT use
  // mode:'no-cors' -- that makes this response opaque and success unverifiable.
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET requests (someone opening the /exec URL in a browser) get a harmless page.
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, message: 'RSVP endpoint is up. See the wedding site to RSVP.' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function validate(p) {
  var errors = [];
  var name = clean(p.name, 100);
  var email = clean(p.email, 100).toLowerCase();
  var attending = clean(p.attending, 3).toLowerCase();

  if (!name) errors.push('name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('a valid email is required');
  if (attending !== 'yes' && attending !== 'no') errors.push('attending must be yes or no');

  var partySize = '', partyNames = '', dietary = '', allergies = '';
  var airport = '', arrivalDate = '', flightNumber = '', departureDate = '';

  if (attending === 'yes') {
    partySize = parseInt(p.party_size, 10);
    if (isNaN(partySize) || partySize < 1 || partySize > 10) {
      errors.push('party size must be a number from 1 to 10');
      partySize = '';
    }
    partyNames = clean(p.party_names, 500);
    dietary = clean(p.dietary_restrictions, 1000);   // "Name: value; Name: value" when party > 1
    allergies = clean(p.allergies, 1000);            // per-person, composed by the frontend
    airport = clean(p.arrival_airport, 20).toUpperCase();
    if (VALID_AIRPORTS.indexOf(airport) === -1) errors.push('arrival airport must be one of IXE / OTHER / NOT_SURE');
    arrivalDate = clean(p.arrival_date, 20);
    departureDate = clean(p.departure_date, 20);
    var isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDate.test(arrivalDate)) errors.push('arrival date is required (YYYY-MM-DD)');
    if (!isoDate.test(departureDate)) errors.push('departure date is required (YYYY-MM-DD)');
    flightNumber = clean(p.flight_number, 20); // optional -- most guests will not have booked yet
  }

  return {
    errors: errors, name: name, email: email, attending: attending,
    partySize: partySize, partyNames: partyNames, dietary: dietary,
    allergies: allergies, airport: airport, arrivalDate: arrivalDate,
    flightNumber: flightNumber, departureDate: departureDate
  };
}

function clean(value, maxLen) {
  return String(value == null ? '' : value).trim().slice(0, maxLen);
}

function notifyAlex(r) {
  try {
    var subject = '[Wedding RSVP] ' + r.name + ' -- ' +
      (r.attending === 'yes' ? 'YES (' + r.party_size + ')' : 'no');
    var body =
      'Name: ' + r.name + '\n' +
      'Email: ' + r.email + '\n' +
      'Attending: ' + r.attending + '\n' +
      (r.attending === 'yes'
        ? 'Party size: ' + r.party_size + '\n' +
          'Party names: ' + r.party_names + '\n' +
          'Dietary: ' + r.dietary_restrictions + '\n' +
          'Allergies: ' + r.allergies + '\n' +
          'Arriving: ' + r.arrival_airport + ' on ' + r.arrival_date +
          (r.flight_number ? ' (flight ' + r.flight_number + ')' : '') + '\n' +
          'Departing: ' + r.departure_date + '\n'
        : '') +
      '\nSheet: https://docs.google.com/spreadsheets/d/' + SHEET_ID;
    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
  } catch (err) {
    // Notification failure must never fail the guest's RSVP. Logged rows are the source of truth.
    console.error('notifyAlex failed: ' + err);
  }
}

// ---- Weekly heartbeat (Mondays): "N rows as of Monday, endpoint self-test OK" ----
function weeklyHeartbeat() {
  var count = 'unknown', selfTest = 'NOT RUN';
  try {
    var log = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Log');
    count = Math.max(0, log.getLastRow() - 1);
  } catch (err) { count = 'SHEET READ FAILED: ' + err; }
  try {
    if (WEB_APP_URL.indexOf('https://') === 0) {
      var resp = UrlFetchApp.fetch(WEB_APP_URL, {
        method: 'post',
        payload: { website: 'heartbeat-self-test' }, // honeypot: full pipeline, zero data written
        muteHttpExceptions: true,
        followRedirects: true
      });
      var parsed = JSON.parse(resp.getContentText());
      selfTest = (parsed.ok === true) ? 'OK' : 'FAILED -- unexpected body: ' + resp.getContentText().slice(0, 200);
    } else {
      selfTest = 'SKIPPED -- WEB_APP_URL not configured';
    }
  } catch (err) { selfTest = 'FAILED -- ' + err; }
  MailApp.sendEmail(NOTIFY_EMAIL,
    '[Wedding RSVP] Heartbeat: ' + count + ' submissions, endpoint ' + selfTest,
    'Rows in Log: ' + count + '\nEndpoint self-test: ' + selfTest + '\nAs of: ' + new Date() +
    '\n\nIf self-test FAILED, redeploy via Manage deployments > edit (NEVER "New deployment" -- it mints a new URL and orphans the one in the HTML).');
}

// ---- Weekly CSV backup (Mondays): the no-git safety net for RSVP data ----
function weeklyBackup() {
  var log = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Log');
  var data = log.getDataRange().getValues();
  var csv = data.map(function (row) {
    return row.map(function (cell) {
      var s = (cell instanceof Date) ? cell.toISOString() : String(cell);
      s = s.replace(/"/g, '""');
      return /[",\n]/.test(s) ? '"' + s + '"' : s;
    }).join(',');
  }).join('\r\n');
  var stamp = Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd');
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '[Wedding RSVP] Weekly backup -- ' + (data.length - 1) + ' rows (' + stamp + ')',
    body: 'Full append-only Log attached. Keep these emails; they are the offsite backup.',
    attachments: [Utilities.newBlob(csv, 'text/csv', 'rsvp-log-' + stamp + '.csv')]
  });
}

// ---- Run ONCE from the editor (Run > installTriggers) to install both weekly triggers ----
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); }); // idempotent
  ScriptApp.newTrigger('weeklyHeartbeat').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
  MailApp.sendEmail(NOTIFY_EMAIL, '[Wedding RSVP] Triggers installed',
    'weeklyHeartbeat + weeklyBackup will run every Monday ~9am. This email also confirms MailApp permission works.');
}

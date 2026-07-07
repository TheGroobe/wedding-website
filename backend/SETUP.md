# RSVP backend setup — the no-jargon version

This is the whole Google plumbing, one action per step, with what you should see after each.
Do it once. Total time: ~30–40 minutes. You need **your own personal Google account**
(the one you already use — **not** a brand-new throwaway, and **not** anything Stax/work).

> **Why your existing account, not a new one?** Google's abuse detection flags *new*
> accounts that suddenly deploy a public web app and start sending emails. If it trips
> mid-RSVP-season it can suspend the account and lock every RSVP inside. An account with
> real history doesn't get flagged. Use the Gmail you've had for years.

---

## 1. Make the Sheet

1. Go to **sheets.new** (type it in the address bar). A blank spreadsheet opens.
   - *You should see:* an untitled grid.
2. Click the title (top-left, "Untitled spreadsheet") and rename it **Wedding RSVPs**.
3. Double-click the tab at the bottom (it says `Sheet1`) and rename it **Log** (capital L).
4. Import the header row: **File → Import → Upload**, drag in `sheet-template.csv`
   (it's in this `backend/` folder). On the dialog, choose **"Replace current sheet"**,
   then **Import data**.
   - *You should see:* row 1 filled with 13 headers, starting `timestamp, name, email, …`.
5. Make row 1 permanent-looking: click row number **1** to select it → **View → Freeze → 1 row**,
   then click **Bold** (B). *(Never sort the Log tab — it's meant to only ever grow. Sorting is the Latest tab's job, below.)*
6. Add the **Latest** tab (this shows the newest answer per guest, auto-updating):
   - Click the **+** at the bottom-left to add a tab. Rename it **Latest**.
   - Click cell **A1**, paste exactly:
     ```
     =Log!A1:M1
     ```
   - Click cell **A2**, paste exactly:
     ```
     =IFERROR(SORTN(SORT(FILTER(Log!A2:M, Log!A2:A<>""), 1, FALSE), 9^9, 2, 3, TRUE), "No RSVPs yet")
     ```
   - *You should see:* the headers in row 1 and "No RSVPs yet" below (until real RSVPs arrive).
7. Add the **Not Responded** tab (your manual follow-up helper — replaces automated reminders):
   - Add another tab, rename it **Not Responded**.
   - In **A1** type `email`, in **B1** type `status`.
   - In cell **B2**, paste exactly:
     ```
     =ARRAYFORMULA(IF(A2:A="",,IF(COUNTIF(Log!C:C, A2:A)>0, "responded", "NOT YET")))
     ```
   - As your guest list firms up, paste invited emails down column A. Column B fills itself in:
     "responded" or "NOT YET".
8. **Grab the Sheet ID** — you need it in step 2. Look at the browser address bar:
   ```
   https://docs.google.com/spreadsheets/d/THIS_LONG_STRING_IS_THE_ID/edit
   ```
   Copy the long string between `/d/` and `/edit`. Paste it somewhere safe for a minute.
9. Quick sanity check: type any text into `Log` row 2, and an email address into cell **C2**.
   The Latest tab should instantly show that row. Then **delete** that test row.

---

## 2. Paste the script

1. Still in the Sheet: **Extensions → Apps Script**. A code editor opens in a new tab.
   - *You should see:* a file `Code.gs` with an empty `myFunction() {}`.
2. Select everything in that editor (Cmd+A) and delete it.
3. Open `apps-script.gs` (in this `backend/` folder), copy **all** of it, paste into the editor.
4. Fill in the two values at the top:
   - `SHEET_ID` → the long string you copied in step 1.8 (keep the quotes: `var SHEET_ID = 'abc123...';`).
   - `NOTIFY_EMAIL` → the email where you want RSVP notifications (your personal email).
   - *(Leave `WEB_APP_URL` alone for now — you fill it in step 3.)*
5. Save: **Cmd+S**. When it asks, name the project **Wedding RSVP Backend**.

---

## 3. Deploy it

> ### ⚠️ TWO RULES THAT WILL BREAK THE FORM IF YOU GET THEM WRONG
>
> **RULE A — Access must be "Anyone", NOT "Anyone with Google account".**
> Your guests open the site from inside WhatsApp, which has no Google login.
> "Anyone with Google account" bounces them to a login screen and the form dies.
> It *works for you* (you're always logged in), so you'd never notice — but every guest is blocked.
>
> **RULE B — After the first deploy, every future change goes through
> "Manage deployments → ✏️ edit", NEVER "New deployment".**
> "New deployment" mints a **brand-new URL** and silently orphans the one baked into your
> website — the form keeps spinning forever and no data arrives. Write this on a sticky note.

1. Top-right of the Apps Script editor: **Deploy → New deployment**.
   *(This is the ONE time you ever click "New deployment.")*
2. Click the gear ⚙️ next to "Select type" → choose **Web app**.
3. Fill the form:
   - **Description:** `rsvp-v1`
   - **Execute as:** **Me** (your email).
   - **Who has access:** **Anyone** ← see RULE A. Not "Anyone with Google account".
4. Click **Deploy**. Google asks you to authorize — click through, pick your account,
   click **Advanced → Go to Wedding RSVP Backend (unsafe)** (it's your own script, this is normal),
   then **Allow**. It's asking for: edit your sheets, send email as you, connect to external URLs.
5. Copy the **Web app URL**. It **must end in `/exec`** (not `/dev` — `/dev` needs a Google login
   and runs unsaved code).
6. Paste that URL in **two places**:
   - Back in the Apps Script editor, into `WEB_APP_URL` at the top (keep the quotes), then **Cmd+S**.
   - Into `site/app.js`, the line `var ENDPOINT = 'PASTE_EXEC_URL_HERE';` (the developer sets this
     when wiring the site — hand them the URL).

---

## 4. Install the Monday emails

1. In the Apps Script editor, find the function dropdown in the toolbar (near Run/Debug).
   Select **installTriggers**.
2. Click **Run**. (Authorize again if asked.)
   - *You should see:* an email arrive titled **"[Wedding RSVP] Triggers installed"**. That email
     also proves your send-email permission works.
3. Optional: click the clock icon (⏰ Triggers) on the left — you'll see two weekly triggers,
   `weeklyHeartbeat` and `weeklyBackup`, both Monday ~9am.

**What these do for you, hands-off:**
- **weeklyHeartbeat** — every Monday, emails you "N RSVPs so far, endpoint OK". If it ever says
  FAILED, the form is down — go re-deploy via Manage deployments → edit (RULE B).
- **weeklyBackup** — every Monday, emails you the full RSVP list as a CSV attachment. Keep these
  emails; they're your offsite backup if anything ever happens to the Sheet.

---

## 5. Test it

1. Open your live wedding site.
2. Fill in a fake RSVP with your own email and hit **Send our RSVP**.
   - *You should see:* the button shows a spinner + "Sending…" for a few seconds (Google's server
     waking up — normal, 3–10s), then a warm "We can't wait to see you" confirmation.
3. Open the Sheet → **Log** tab: a new row appeared with all your answers.
4. Check your email: a **"[Wedding RSVP]"** notification arrived.
5. Delete your test row from the Log tab. *(Fine to do now, before real RSVPs. Never delete rows
   after real guests start responding — that's your only copy besides the weekly backup.)*

---

## 6. If something breaks

| Symptom | Cause | Fix |
|---|---|---|
| Form spins forever, no confirmation | Wrong `/exec` URL, or access set to "Anyone with Google account" | Re-check the URL in `app.js` ends in `/exec`; re-check deployment access = "Anyone" (Deploy → Manage deployments) |
| Monday heartbeat email says **FAILED** | Deployment went stale (often after a "New deployment") | Re-deploy via **Manage deployments → ✏️ edit → New version → Deploy** (RULE B) |
| No Monday email at all | Triggers didn't install | Re-run `installTriggers` (step 4); check the ⏰ Triggers page |
| You need the RSVP data right now | — | Any weekly-backup email has the full CSV attached |
| Guest says the form errored | Their connection, usually | The error screen tells them to WhatsApp you; add them to the Sheet by hand |

That's the whole system. No developer required to keep it running.

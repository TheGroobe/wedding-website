# Pre-launch manual test checklist
Run top to bottom before sending the link to any guest. Date each pass.

1. [ ] Submit RSVP (attending=yes) on mobile -- see pending state, then inline confirmation
2. [ ] Submit RSVP (attending=no) on mobile -- conditional fields hidden
3. [ ] Re-submit same email -- verify Log tab has BOTH entries, Latest tab shows newest
4. [ ] Submit with missing required fields -- client validation fires (no network request sent)
5. [ ] Submit with honeypot filled (DevTools: set #website value) -- fake success, NO new Log row
6. [ ] Double-click submit button -- exactly one Log row (button disable + LockService)
7. [ ] Verify per-submission notification email received
8. [ ] India reachability: India-based contact submits a test RSVP from Jio/Airtel
9. [ ] WhatsApp in-app browser test (iOS AND Android) -- send link in WhatsApp, open INSIDE WhatsApp, submit
10. [ ] Incognito / logged-out-of-Google test -- submit from a browser with no Google session
      (catches the "Anyone with Google account" misconfiguration)
11. [ ] Lighthouse 3G throttle: page loads < 3 seconds including font payload
12. [ ] All travel guide links work on mobile (visa site, wa.me, mailto, anchors)
13. [ ] AVIF/WebP images render on iOS Safari AND Android Chrome (picture fallback chain)
14. [ ] OG preview card renders correctly in WhatsApp AND iMessage when sharing the URL
      (WhatsApp caches previews -- test with ?v=2 if iterating on the image)
15. [ ] Verify /exec URL (not /dev) is hardcoded in app.js ENDPOINT
16. [ ] Verify deployment access = "Anyone" (not "Anyone with Google account")
      at script.google.com > Deploy > Manage deployments

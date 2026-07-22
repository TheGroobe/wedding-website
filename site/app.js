(function () {
  'use strict';

  // ==== CONFIG ====
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzbGhyVR3FiaieY2UerRWDaaKYw1XUYkf2OHt2VOL0OVXFnO0XDLP0ILLbrgkDyjsax/exec';
  var DEADLINE_UTC = Date.UTC(2026, 9, 1, 6, 59, 59); // Sep 30, 2026 23:59:59 Pacific (PDT = UTC-7)

  // ==== Fixed nav: transparent over the hero, solid (with logo crossfade) after 60px.
  //      travel.html's nav carries .nav--solid and skips this entirely. ====
  var nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('nav--solid')) {
    var onNavScroll = function () {
      nav.classList.toggle('nav--scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onNavScroll, { passive: true });
    onNavScroll();
  }

  // ==== Schedule ceremony modal ====
  var modal = document.getElementById('modal');
  if (modal) {
    var mEyebrow = document.getElementById('modal-eyebrow');
    var mTitle = document.getElementById('modal-title');
    var mBody = document.getElementById('modal-body');
    var lastFocus = null;

    function openModal(btn) {
      var key = btn.getAttribute('data-event');
      var tpl = document.getElementById('evt-' + key);
      mEyebrow.textContent = btn.getAttribute('data-when') || '';
      mTitle.textContent = btn.getAttribute('data-title') || '';
      mBody.innerHTML = tpl ? tpl.innerHTML : '';
      lastFocus = btn;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      modal.querySelector('.modal__close').focus();
    }
    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    document.querySelectorAll('.event').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn); });
    });
    modal.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  // ==== RSVP form wiring ====
  var form = document.getElementById('rsvp-form');
  if (!form) return;
  var yesFields = document.getElementById('yes-fields');
  var partySize = document.getElementById('f-party-size');
  var people = document.getElementById('party-people');
  var submitBtn = document.getElementById('submit-btn');
  var liveWrap = document.getElementById('rsvp-live');
  var rsvpHead = document.querySelector('#rsvp .section-head');
  var successEl = document.getElementById('rsvp-success');
  var errorEl = document.getElementById('rsvp-error');
  var closedEl = document.getElementById('rsvp-closed');

  var DIET_OPTIONS = ['No restrictions', 'Vegetarian', 'Vegan', 'No beef', 'No pork', 'Halal', 'Jain', 'Gluten-free', 'Other'];
  // Allergies are multi-pick: checkboxes, check all that apply. Nothing checked = none;
  // the free-text field catches anything not listed (so no 'None'/'Other' entries needed).
  var ALLERGY_CHECKS = ['Peanuts', 'Tree nuts', 'Shellfish', 'Dairy', 'Eggs', 'Gluten', 'Soy'];

  function optionsHtml(list) {
    return list.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('');
  }

  function checksHtml(list) {
    return list.map(function (a) {
      return '<label class="radio"><input type="checkbox" data-person="allergy-check" value="' + a + '"> ' + a + '</label>';
    }).join('');
  }

  // Deadline: client-side courtesy gate -- the server keeps accepting (graceful, not hard-cut)
  if (Date.now() > DEADLINE_UTC) {
    var formCard = document.querySelector('#rsvp .card--form');
    if (formCard) formCard.hidden = true;
    var deadlineNote = document.querySelector('.rsvp__deadline');
    if (deadlineNote) deadlineNote.hidden = true;
    closedEl.classList.add('rsvp-state--show');
    return;
  }

  // Show yes-only fields; toggle disabled so hidden fields never block validation or submit stale values
  function setYesVisible(on) {
    yesFields.hidden = !on;
    yesFields.querySelectorAll('input, select').forEach(function (el) { el.disabled = !on; });
    if (on) renderPeople();
  }
  form.querySelectorAll('input[name="attending"]').forEach(function (radio) {
    radio.addEventListener('change', function () { setYesVisible(radio.value === 'yes' && radio.checked); });
  });

  // One block per person: name + dietary (dropdown + fill) + allergies (dropdown + fill)
  function renderPeople() {
    var n = Math.min(10, Math.max(1, parseInt(partySize.value, 10) || 1));
    while (people.children.length > n) people.removeChild(people.lastChild);
    for (var i = people.children.length; i < n; i++) {
      var d = document.createElement('div');
      d.className = 'person-block';
      d.innerHTML =
        '<p class="person-block__name">Guest ' + (i + 1) + (i === 0 ? ' (you)' : '') + '</p>' +
        '<div class="field"><label>Name</label>' +
          '<input type="text" data-person="name" maxlength="60"' + (i === 0 ? '' : ' placeholder="Full name"') + '></div>' +
        '<div class="field"><label>Dietary preference</label>' +
          '<select data-person="diet-select">' + optionsHtml(DIET_OPTIONS) + '</select></div>' +
        '<div class="field"><label>Anything to add? <span class="field__hint">(optional)</span></label>' +
          '<input type="text" data-person="diet-text" maxlength="80" placeholder="e.g. no onion or garlic, low spice&hellip;"></div>' +
        '<fieldset class="field"><legend>Allergies <span class="field__hint">(check all that apply)</span></legend>' +
          '<div class="checks">' + checksHtml(ALLERGY_CHECKS) + '</div></fieldset>' +
        '<div class="field"><label>Other allergies or severity <span class="field__hint">(optional)</span></label>' +
          '<input type="text" data-person="allergy-text" maxlength="80" placeholder="e.g. sesame; peanuts are severe&hellip;"></div>';
      people.appendChild(d);
    }
    var first = people.querySelector('[data-person="name"]');
    if (first && !first.value) first.value = document.getElementById('f-name').value;
  }
  partySize.addEventListener('input', renderPeople);
  document.getElementById('f-name').addEventListener('change', renderPeople);

  // Combine a dropdown + its free-text into one readable value for the caterer
  function combine(sel, txt) {
    var s = (sel && sel.value) || '';
    var t = (txt && txt.value ? txt.value.trim() : '');
    if (s === 'Other') return t || 'Other';
    return t ? s + ' (' + t + ')' : s;
  }

  // Compose per-person inputs into the 3 fixed hidden fields ("Name: value; Name: value")
  function composeParty() {
    var names = [], diets = [], allergies = [];
    people.querySelectorAll('.person-block').forEach(function (block, i) {
      var name = (block.querySelector('[data-person="name"]').value || 'Guest ' + (i + 1)).trim();
      var diet = combine(block.querySelector('[data-person="diet-select"]'), block.querySelector('[data-person="diet-text"]'));
      // Allergies: gather every checked box, then append the free-text (other allergens/severity)
      var picked = [];
      block.querySelectorAll('[data-person="allergy-check"]').forEach(function (cb) {
        if (cb.checked) picked.push(cb.value);
      });
      var extra = (block.querySelector('[data-person="allergy-text"]').value || '').trim();
      var allergy = picked.join(', ');
      if (extra) allergy = allergy ? allergy + ' (' + extra + ')' : extra;
      if (!allergy) allergy = 'none';
      names.push(name);
      diets.push(name + ': ' + diet);
      allergies.push(name + ': ' + allergy);
    });
    document.getElementById('f-party-names').value = names.join(', ');
    document.getElementById('f-dietary').value = diets.join('; ');
    document.getElementById('f-allergies').value = allergies.join('; ');
    ['f-party-names', 'f-dietary', 'f-allergies'].forEach(function (id) {
      document.getElementById(id).disabled = false;
    });
  }

  function setPending(on) {
    submitBtn.disabled = on;
    submitBtn.innerHTML = on ? '<span class="spinner" aria-hidden="true"></span>Sending&hellip;' : 'Send our RSVP';
  }

  function showError(detail) {
    errorEl.classList.add('rsvp-state--show');
    document.getElementById('rsvp-error-detail').textContent = detail || '';
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Success takes over: hide the header + form, reveal the big confirmation, scroll it into view
  function showSuccess() {
    if (rsvpHead) rsvpHead.hidden = true;
    if (liveWrap) liveWrap.hidden = true;
    successEl.classList.add('rsvp-success--show');
    document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    errorEl.classList.remove('rsvp-state--show');
    var attendingYes = !!form.querySelector('input[name="attending"][value="yes"]:checked');
    if (attendingYes) composeParty();
    if (!form.reportValidity()) return; // client checks required fields; server re-validates everything

    setPending(true);
    var body = new URLSearchParams(new FormData(form));
    body.set('ua', navigator.userAgent);

    // URL-encoded POST = a CORS "simple request": no preflight, readable JSON response.
    // Confirm ONLY on {ok:true} -- never render success over a failed write.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json && json.ok === true) { showSuccess(); }
        else { showError((json && json.message) || 'The server said no. Try once more?'); }
      })
      .catch(function () {
        showError('We couldn\'t reach the RSVP server. Check your connection and try again.');
      })
      .finally(function () { setPending(false); });
  });

  document.getElementById('retry-btn').addEventListener('click', function () {
    errorEl.classList.remove('rsvp-state--show');
    submitBtn.focus();
  });
})();

(function () {
  'use strict';

  // ==== CONFIG ====
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzbGhyVR3FiaieY2UerRWDaaKYw1XUYkf2OHt2VOL0OVXFnO0XDLP0ILLbrgkDyjsax/exec'; // pinned /exec URL — update via Manage deployments > edit, never New deployment
  var DEADLINE_UTC = Date.UTC(2026, 9, 2, 6, 59, 59); // Oct 1, 2026 23:59:59 Pacific (PDT = UTC-7)

  // ==== Sticky nav: appear once the hero scrolls away ====
  var nav = document.getElementById('nav');
  var hero = document.querySelector('.hero');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('nav--visible', !entries[0].isIntersecting);
    }, { rootMargin: '-60px 0px 0px 0px' }).observe(hero);
  } else {
    nav.classList.add('nav--visible'); // ancient browsers: always show
  }

  // ==== RSVP form wiring ====
  var form = document.getElementById('rsvp-form');
  if (!form) return;
  var yesFields = document.getElementById('yes-fields');
  var partySize = document.getElementById('f-party-size');
  var people = document.getElementById('party-people');
  var submitBtn = document.getElementById('submit-btn');
  var states = {
    success: document.getElementById('rsvp-success'),
    error: document.getElementById('rsvp-error'),
    closed: document.getElementById('rsvp-closed')
  };

  // Deadline: client-side courtesy gate only -- the server keeps accepting (graceful, not hard-cut)
  if (Date.now() > DEADLINE_UTC) {
    form.hidden = true;
    states.closed.classList.add('rsvp-state--show');
    return;
  }

  // Conditional yes/no: toggle visibility AND disabled so hidden fields
  // neither block HTML5 validation nor submit stale values
  function setYesVisible(on) {
    yesFields.hidden = !on;
    yesFields.querySelectorAll('input, select').forEach(function (el) {
      el.disabled = !on;
    });
    if (on) renderPeople();
  }
  form.querySelectorAll('input[name="attending"]').forEach(function (radio) {
    radio.addEventListener('change', function () { setYesVisible(radio.value === 'yes' && radio.checked); });
  });

  // One block per person: name + dietary + allergies (caterer needs to know WHO)
  function renderPeople() {
    var n = Math.min(10, Math.max(1, parseInt(partySize.value, 10) || 1));
    while (people.children.length > n) people.removeChild(people.lastChild);
    for (var i = people.children.length; i < n; i++) {
      var d = document.createElement('div');
      d.className = 'person-block';
      d.innerHTML =
        '<div class="field"><label>Guest ' + (i + 1) + (i === 0 ? ' (you)' : '') + ' &mdash; name</label>' +
        '<input type="text" data-person="name" maxlength="60"' + (i === 0 ? '' : ' placeholder="Full name"') + '></div>' +
        '<div class="field"><label>Dietary preference</label>' +
        '<input type="text" data-person="diet" maxlength="80" placeholder="vegetarian, vegan, no beef, none&hellip;"></div>' +
        '<div class="field"><label>Allergies</label>' +
        '<input type="text" data-person="allergy" maxlength="80" placeholder="peanuts, shellfish, none&hellip;"></div>';
      people.appendChild(d);
    }
    var first = people.querySelector('[data-person="name"]');
    if (first && !first.value) first.value = document.getElementById('f-name').value;
  }
  partySize.addEventListener('input', renderPeople);
  document.getElementById('f-name').addEventListener('change', renderPeople);

  // Compose per-person inputs into the 3 fixed hidden fields ("Name: value; Name: value")
  function composeParty() {
    var names = [], diets = [], allergies = [];
    people.querySelectorAll('.person-block').forEach(function (block, i) {
      var name = (block.querySelector('[data-person="name"]').value || 'Guest ' + (i + 1)).trim();
      var diet = (block.querySelector('[data-person="diet"]').value || 'none').trim();
      var allergy = (block.querySelector('[data-person="allergy"]').value || 'none').trim();
      names.push(name);
      diets.push(name + ': ' + diet);
      allergies.push(name + ': ' + allergy);
    });
    document.getElementById('f-party-names').value = names.join(', ');
    document.getElementById('f-dietary').value = diets.join('; ');
    document.getElementById('f-allergies').value = allergies.join('; ');
    // hidden fields are disabled until composed, so a "no" RSVP submits them empty
    ['f-party-names', 'f-dietary', 'f-allergies'].forEach(function (id) {
      document.getElementById(id).disabled = false;
    });
  }

  function setPending(on) {
    submitBtn.disabled = on;
    submitBtn.innerHTML = on ? '<span class="spinner" aria-hidden="true"></span>Sending&hellip;' : 'Send our RSVP';
  }
  function showState(which, detail) {
    Object.keys(states).forEach(function (k) { states[k].classList.remove('rsvp-state--show'); });
    if (which) {
      states[which].classList.add('rsvp-state--show');
      states[which].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (which === 'error') {
      document.getElementById('rsvp-error-detail').textContent = detail || '';
    }
    form.hidden = (which === 'success');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var attendingYes = !!form.querySelector('input[name="attending"][value="yes"]:checked');
    if (attendingYes) composeParty();
    if (!form.reportValidity()) return; // client validation -- server re-validates everything

    setPending(true);
    var body = new URLSearchParams(new FormData(form));
    body.set('ua', navigator.userAgent);

    // URL-encoded POST = a CORS "simple request": no preflight, and Apps Script's
    // JSON response is readable. Confirm ONLY on {ok:true} -- an opaque or non-ok
    // response must never render the thank-you over a failed write.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json && json.ok === true) {
          showState('success');
        } else {
          showState('error', (json && json.message) || 'The server said no. Try once more?');
        }
      })
      .catch(function () {
        showState('error', 'We could not reach the RSVP server. Check your connection and try again.');
      })
      .finally(function () { setPending(false); });
  });

  document.getElementById('retry-btn').addEventListener('click', function () {
    showState(null);
    form.hidden = false;
    submitBtn.focus();
  });
})();

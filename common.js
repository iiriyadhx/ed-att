// Shared helpers for all pages. No security decision is made in this file —
// the server re-validates everything on every request.

const DEVICE_KEY = 'ed_att_device_id';

async function api(action, payload) {
  try {
    // text/plain keeps this a "simple" CORS request (no preflight), which Apps Script supports.
    const res = await fetch(window.APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
    if (!res.ok) return { ok: false, code: 'NETWORK' };
    return await res.json();
  } catch (e) {
    return { ok: false, code: 'NETWORK' };
  }
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};

/** Random per-phone identifier (used only to stop one phone registering several names per day). */
function deviceId() {
  let id = store.get(DEVICE_KEY);
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    id = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    store.set(DEVICE_KEY, id);
  }
  return id;
}

const MESSAGES = {
  CONFIRMED:           'Attendance confirmed.',
  OUTSIDE_GEOFENCE:    'Attendance denied: You are outside the authorized hospital area.',
  LOCATION_MISSING:    'Attendance denied: Your location could not be verified.',
  LOCATION_UNRELIABLE: 'Attendance denied: Your location could not be verified.',
  LOCATION_INACCURATE: 'Attendance denied: Location accuracy is too low. Turn on Precise Location and move near an entrance or window.',
  LOCATION_STALE:      'Attendance denied: Location reading is too old. Please try again.',
  LOCATION_DENIED:     'Attendance denied: Location verification failed. Please enable location services and try again.',
  LOCATION_TIMEOUT:    'Attendance denied: Location could not be obtained in time. Please try again.',
  NO_GEOLOCATION:      'This browser does not support location services.',
  NAME_INVALID:        'Enter your full name (at least three words, letters only).',
  LEVEL_INVALID:       'Choose your level: R1, R2, R3 or R4.',
  DEVICE_INVALID:      'This device could not be identified. Do not use private browsing.',
  DEVICE_USED_TODAY:   'This phone has already registered someone else today. Each resident must use their own phone.',
  NOT_AUTHORIZED:      'Not authorized.',
  ALREADY_RECORDED:    'Attendance already recorded for today.',
  QR_INVALID:          'Attendance denied: Scan the QR code currently shown on the ED screen.',
  RATE_LIMITED:        'Too many attempts. Please wait a few minutes.',
  BUSY:                'System busy. Please try again.',
  CONFIG_ERROR:        'System configuration error. Contact the administrator.',
  SERVER_ERROR:        'Server error. Please try again.',
  NETWORK:             'Network error. Check your internet connection.',
  BAD_REQUEST:         'Invalid request.',
  REASON_REQUIRED:     'A reason of at least 10 characters is required.'
};

function msg(code) {
  return '<div>' + esc(MESSAGES[code] || MESSAGES.SERVER_ERROR) + '</div>';
}

function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function $(id) { return document.getElementById(id); }

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
  CONFIRMED:           ['تم تسجيل حضورك بنجاح', 'Attendance confirmed.'],
  OUTSIDE_GEOFENCE:    ['مرفوض: أنت خارج نطاق المستشفى المعتمد', 'Attendance denied: You are outside the authorized hospital area.'],
  LOCATION_MISSING:    ['مرفوض: تعذّر التحقق من موقعك', 'Attendance denied: Your location could not be verified.'],
  LOCATION_UNRELIABLE: ['مرفوض: تعذّر التحقق من موقعك', 'Attendance denied: Your location could not be verified.'],
  LOCATION_INACCURATE: ['مرفوض: دقة الموقع غير كافية. فعّل "الموقع الدقيق" واقترب من مدخل أو نافذة', 'Attendance denied: Location accuracy is too low.'],
  LOCATION_STALE:      ['مرفوض: قراءة الموقع قديمة، أعد المحاولة', 'Attendance denied: Location reading is too old.'],
  LOCATION_DENIED:     ['مرفوض: فشل التحقق من الموقع. فعّل خدمات الموقع للمتصفح وأعد المحاولة', 'Attendance denied: Location verification failed. Please enable location services and try again.'],
  LOCATION_TIMEOUT:    ['مرفوض: لم نتمكن من تحديد موقعك في الوقت المحدد، أعد المحاولة', 'Attendance denied: Location could not be obtained in time.'],
  NO_GEOLOCATION:      ['هذا المتصفح لا يدعم تحديد الموقع', 'This browser does not support location services.'],
  NAME_INVALID:        ['اكتب اسمك الثلاثي كاملاً (ثلاث كلمات على الأقل، حروف فقط)', 'Enter your full name (at least three words, letters only).'],
  LEVEL_INVALID:       ['اختر المستوى: R1 أو R2 أو R3 أو R4', 'Choose a level: R1, R2, R3 or R4.'],
  DEVICE_INVALID:      ['تعذّر التعرف على الجهاز. افتح الصفحة في نافذة عادية (ليست خاصة)', 'Device could not be identified. Do not use private browsing.'],
  DEVICE_USED_TODAY:   ['هذا الجوال سُجّل به حضور شخص آخر اليوم. كل مقيم يسجّل من جواله', 'This phone already registered someone else today.'],
  NOT_AUTHORIZED:      ['غير مصرّح لك بهذا الإجراء', 'Not authorized.'],
  ALREADY_RECORDED:    ['تم تسجيل حضورك مسبقاً اليوم', 'Attendance already recorded for today.'],
  QR_INVALID:          ['مرفوض: امسح رمز QR المعروض حالياً على شاشة الطوارئ', 'Attendance denied: Scan the QR code currently shown on the ED screen.'],
  RATE_LIMITED:        ['محاولات كثيرة، انتظر بضع دقائق', 'Too many attempts. Please wait a few minutes.'],
  BUSY:                ['النظام مشغول، أعد المحاولة', 'System busy, please try again.'],
  CONFIG_ERROR:        ['خطأ في إعدادات النظام، تواصل مع المسؤول', 'System configuration error.'],
  SERVER_ERROR:        ['خطأ في الخادم، أعد المحاولة', 'Server error, please try again.'],
  NETWORK:             ['تعذّر الاتصال بالخادم. تحقق من الإنترنت', 'Network error. Check your connection.'],
  BAD_REQUEST:         ['طلب غير صالح', 'Invalid request.'],
  REASON_REQUIRED:     ['اكتب سبباً واضحاً (10 أحرف على الأقل)', 'A reason of at least 10 characters is required.']
};

function msg(code) {
  const m = MESSAGES[code] || MESSAGES.SERVER_ERROR;
  return '<div>' + esc(m[0]) + '</div><div class="en">' + esc(m[1]) + '</div>';
}

function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function $(id) { return document.getElementById(id); }

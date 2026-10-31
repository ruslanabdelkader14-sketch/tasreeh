/**
 * trip-defaults-core.js
 * منطق مشترك للبيانات الافتراضية للرحلات (index.html + htmlAkhtar.html + trip-defaults.html)
 *
 * القاعدة (rule) = { rule_id, trip_type, from_location, to_location,
 *                    type_suffix, program, departure_time, return_time,
 *                    directions:[..], exits:[..] }
 *  - trip_type / from_location / to_location: فاضي أو '*' = "الكل"
 *  - باقي الحقول: فاضي = "ورّث من القاعدة الأعم"، والقيمة '-' = "اطبعها نقط فاضية"
 *  - الأخصّ يكسب: (إلى) > (من) > (نوع الرحلة). ولكل حقل لوحده أول قاعدة غير فاضية فيه.
 */
(function (w) {
  'use strict';

  var KEY = 'tripDefaultsStore';

  var DIRS = [
    { k: 'cairo', l: 'القاهرة' }, { k: 'alex', l: 'الإسكندرية' }, { k: 'sharm', l: 'شرم الشيخ' },
    { k: 'luxor', l: 'الأقصر' }, { k: 'aswan', l: 'أسوان' }
  ];
  var EXITS = [
    { k: 'gouna', l: 'كمين الجونة' }, { k: 'safaga', l: 'كمين سفاجا – قنا' }, { k: 'marsa', l: 'كمين مرسى علم – إدفو' }
  ];

  var CAIRO_PROGRAM = 'رست الزعفرانة + هرم + متحف جديد + قلعه + جوله نيل + محلات + غداء + مصر القديمه + خان الخليلي';
  var LUXOR_PROGRAM = 'رست 85 – دندره -+كرنك+حتشبسوت+ملوك+ملكات+محلات+جزيره+جولة نيل+مرسي اهالي+غداء +';

  function R(t, f, to, o) {
    o = o || {};
    return {
      rule_id: o.id || '', trip_type: t, from_location: f, to_location: to,
      type_suffix: o.suffix || '', program: o.program || '',
      departure_time: o.dep || '', return_time: o.ret || '',
      directions: o.dirs || [], exits: o.exits || []
    };
  }

  // القيم الأصلية (نفس السلوك القديم المكتوب جوه الكود)
  var SEED = {
    options: {
      trip_type: ['أوفر داي', 'أوفر نايت', 'توصيلة'],
      from_location: ['الغردقة', 'مرسى علم', 'الأقصر', 'أسوان'],
      to_location: ['القاهرة', 'الأقصر', 'أسوان', 'مرسى علم', 'الإسكندرية', 'شرم الشيخ']
    },
    rules: [
      R('', '', '', { id: 'S01', dep: '6 ص', ret: '18' }),
      R('توصيلة', '', '', { id: 'S02', ret: '-' }),
      R('', '', 'القاهرة', { id: 'S03', program: CAIRO_PROGRAM, dirs: ['cairo'], exits: ['gouna'] }),
      R('توصيلة', '', 'القاهرة', { id: 'S04', program: 'رست الزعفرانة +' }),
      R('', '', 'الإسكندرية', { id: 'S05', dirs: ['alex'], exits: ['gouna'] }),
      R('', '', 'شرم الشيخ', { id: 'S06', dirs: ['sharm'], exits: ['gouna'] }),
      R('', '', 'الأقصر', { id: 'S07', program: LUXOR_PROGRAM, dirs: ['luxor'], exits: ['safaga'] }),
      R('توصيلة', '', 'الأقصر', { id: 'S08', program: 'رست 85 +' }),
      R('', '', 'أسوان', { id: 'S09', dirs: ['aswan'], exits: ['safaga'] }),
      R('', 'مرسى علم', 'أسوان', { id: 'S10', exits: ['marsa'] }),
      R('', 'مرسى علم', 'مرسى علم', { id: 'S14', exits: ['marsa'] }),
      R('', 'مرسى علم', '', { id: 'S11', suffix: 'مرسى علم' }),
      R('', 'أسوان', '', { id: 'S12', suffix: 'من أسوان' }),
      R('', 'الأقصر', '', { id: 'S13', suffix: 'من الأقصر' })
    ]
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function norm(s) {
    return String(s == null ? '' : s).trim()
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ');
  }

  function isAny(v) { var n = String(v == null ? '' : v).trim(); return n === '' || n === '*'; }

  function cleanRule(r) {
    r = r || {};
    var s = function (v) { return String(v == null ? '' : v).trim(); };
    var any = function (v) { return isAny(v) ? '' : s(v); };
    var arr = function (v) { return Array.isArray(v) ? v.map(s).filter(Boolean) : []; };
    return {
      rule_id: s(r.rule_id), trip_type: any(r.trip_type), from_location: any(r.from_location), to_location: any(r.to_location),
      type_suffix: s(r.type_suffix), program: s(r.program), departure_time: s(r.departure_time), return_time: s(r.return_time),
      directions: arr(r.directions), exits: arr(r.exits)
    };
  }

  // يدمج اللي جاي من السيرفر مع الأصلي لو السيرفر فاضي
  function normalizeStore(d) {
    d = d || {};
    var rules = Array.isArray(d.rules) ? d.rules.map(cleanRule) : [];
    var usingSeed = rules.length === 0;
    if (usingSeed) rules = clone(SEED.rules);
    var opts = {};
    ['trip_type', 'from_location', 'to_location'].forEach(function (k) {
      var list = d.options && Array.isArray(d.options[k]) ? d.options[k].map(function (x) { return String(x).trim(); }).filter(Boolean) : [];
      opts[k] = list.length ? list : clone(SEED.options[k]);
    });
    return { rules: rules, options: opts, usingSeed: usingSeed };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var st = JSON.parse(raw);
        if (st && Array.isArray(st.rules) && st.options) return st;
      }
    } catch (_) {}
    return normalizeStore({});
  }

  function cache(store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {}
  }

  // يرجّع: store | null (فشل) | 'expired'
  function fetchRemote(url, token) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 10000);
    return fetch(url + '?sheet=tripdefaults&token=' + encodeURIComponent(token), { signal: ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.error === 'expired') return 'expired';
        if (!d || !Array.isArray(d.rules)) return null;
        var st = normalizeStore(d);
        cache(st);
        return st;
      })
      .catch(function (e) { console.error('tripdefaults fetch failed', e); return null; })
      .then(function (res) { clearTimeout(timer); return res; });
  }

  var FIELDS = ['program', 'departure_time', 'return_time', 'type_suffix'];

  /**
   * trip: { trip_type, from_location, to_location }
   * يرجّع: { program, dep, ret, suffix, directions[], exits[] }   (dep/ret فاضي = نقط)
   */
  function resolve(trip, store) {
    store = store || load();
    trip = trip || {};
    var t = norm(trip.trip_type), f = norm(trip.from_location), to = norm(trip.to_location);

    var matched = [];
    (store.rules || []).forEach(function (r, idx) {
      var score = 0;
      if (!isAny(r.trip_type)) { if (norm(r.trip_type) !== t) return; score += 1; }
      if (!isAny(r.from_location)) { if (norm(r.from_location) !== f) return; score += 2; }
      if (!isAny(r.to_location)) { if (norm(r.to_location) !== to) return; score += 4; }
      matched.push({ r: r, score: score, idx: idx });
    });
    matched.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });

    var out = { program: '', dep: '', ret: '', suffix: '', directions: [], exits: [] };
    var pick = function (field) {
      for (var i = 0; i < matched.length; i++) {
        var v = String(matched[i].r[field] == null ? '' : matched[i].r[field]).trim();
        if (v) return v;
      }
      return '';
    };
    var pickArr = function (field) {
      for (var i = 0; i < matched.length; i++) {
        var a = matched[i].r[field];
        if (Array.isArray(a) && a.length) return a.slice();
      }
      return [];
    };
    var dash = function (v) { return v === '-' ? '' : v; };

    out.program = dash(pick('program'));
    out.dep = dash(pick('departure_time'));
    out.ret = dash(pick('return_time'));
    out.suffix = dash(pick('type_suffix'));
    out.directions = pickArr('directions');
    out.exits = pickArr('exits');
    return out;
  }

  w.TripDefaults = {
    KEY: KEY, SEED: SEED, DIRS: DIRS, EXITS: EXITS, DOTS: '....... : .......',
    clone: clone, norm: norm, cleanRule: cleanRule, normalizeStore: normalizeStore,
    load: load, cache: cache, fetchRemote: fetchRemote, resolve: resolve
  };
})(window);

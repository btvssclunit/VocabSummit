/* 词山学海 · Firebase init (v1)
   Anonymous auth + Firestore cloud backup/sync.
   Loaded before app.js via <script> tags (no build step, flat-file deploy).
   Exposes window.WSCloud — a small async API app.js calls into.
   NOTE: anonymous auth is per-device (Firebase cannot link two devices as
   the same person without a real login). This layer provides cloud backup
   + reach analytics now, and becomes the foundation for true cross-device
   sync once the planned login layer lands. 进度码 remains the manual
   cross-device transfer method until then. */
(function () {
  "use strict";

  var firebaseConfig = {
    apiKey: "AIzaSyBX-U43naSZRjDNdjQBnwVO7ArJhZipifY",
    authDomain: "vocabsummit.firebaseapp.com",
    projectId: "vocabsummit",
    storageBucket: "vocabsummit.firebasestorage.app",
    messagingSenderId: "471926413442",
    appId: "1:471926413442:web:6d037f4e7088d429033c9b",
    measurementId: "G-Z92NKBQPSZ"
  };

  var _uid = null;
  var _ready = false;
  var _readyCallbacks = [];
  var _failed = false;

  function fireReady() {
    _ready = true;
    _readyCallbacks.forEach(function (cb) { try { cb(_uid); } catch (e) {} });
    _readyCallbacks = [];
  }

  try {
    firebase.initializeApp(firebaseConfig);
    var auth = firebase.auth();
    var db = firebase.firestore();

    auth.onAuthStateChanged(function (user) {
      if (user) { _uid = user.uid; fireReady(); }
    });
    auth.signInAnonymously().catch(function (err) {
      _failed = true;
      console.error("Firebase anon sign-in failed:", err);
    });
  } catch (e) {
    _failed = true;
    console.error("Firebase init failed:", e);
  }

  function whenReady(cb) {
    if (_failed) return; // fail silently — app must work fully offline/local-only
    if (_ready) cb(_uid); else _readyCallbacks.push(cb);
  }

  function userDoc() {
    return db.collection("users").doc(_uid);
  }

  window.WSCloud = {
    isAvailable: function () { return !_failed; },

    /* profile: { nickname: "坚持不懈·麒麟", school: "..." } */
    saveProfile: function (profile) {
      whenReady(function () {
        userDoc().set({
          profile: profile,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function (e) { console.error("saveProfile failed:", e); });
      });
    },

    /* progress: mirrors the local store object for one stream (g1/g2/g3/hcl) */
    saveProgress: function (streamKey, storeData) {
      whenReady(function () {
        var payload = { progress: {}, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        payload.progress[streamKey] = storeData;
        userDoc().set(payload, { merge: true }).catch(function (e) { console.error("saveProgress failed:", e); });
      });
    },

    getProgress: function (streamKey, cb) {
      whenReady(function () {
        userDoc().get().then(function (snap) {
          var d = snap.exists ? snap.data() : null;
          cb(d && d.progress && d.progress[streamKey] ? d.progress[streamKey] : null);
        }).catch(function (e) { console.error("getProgress failed:", e); cb(null); });
      });
    },

    /* the live Firebase anonymous UID (识别码), or null if not ready yet */
    getUid: function (cb) { whenReady(function () { cb(_uid); }); },

    /* leaderboard: one narrow doc per student per stream, holding ONLY
       nickname + school + altitude (no PII, no per-word progress). Call only
       for role === "student" (app.js gates this). entry = {nickname, school, altitude} */
    saveLeaderboard: function (streamKey, entry) {
      whenReady(function () {
        db.collection("leaderboard").doc(streamKey).collection("entries").doc(_uid).set({
          nickname: entry.nickname || "",
          school: entry.school || "",
          altitude: entry.altitude || 0,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function (e) { console.error("saveLeaderboard failed:", e); });
      });
    },

    /* read the whole stream leaderboard, sorted high→low; cb(array|null).
       Each row: {uid, nickname, school, altitude}. Filtering (校内/跨校) is
       done client-side in app.js on the returned set. (Legacy Board A store;
       superseded by scores/{uid} below, kept for backward compatibility.) */
    getLeaderboard: function (streamKey, cb) {
      whenReady(function () {
        db.collection("leaderboard").doc(streamKey).collection("entries")
          .orderBy("altitude", "desc").get().then(function (qs) {
            var rows = [];
            qs.forEach(function (doc) {
              var d = doc.data() || {};
              rows.push({ uid: doc.id, nickname: d.nickname || "", school: d.school || "", altitude: d.altitude || 0 });
            });
            cb(rows);
          }).catch(function (e) { console.error("getLeaderboard failed:", e); cb(null); });
      });
    },

    /* ---------- scores/{uid} : the leaderboard model (LEADERBOARD_DESIGN §6.2) ----------
       One doc per anonymous uid; each stream is a map field. Holds ONLY
       leaderboard-relevant figures (no per-word progress, no PII beyond the
       chosen nickname + school). Called only for role === "student" (app.js gates).
       entry = { nickname, school, alt, totalPts, bestStreak, pts:{termId->n} } */
    saveScore: function (streamKey, entry) {
      whenReady(function () {
        var s = { nickname: entry.nickname || "", school: entry.school || "",
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        s[streamKey] = {
          alt: entry.alt || 0,
          totalPts: entry.totalPts || 0,
          bestStreak: entry.bestStreak || 0,
          pts: entry.pts || {},
          /* speed boards (DESIGN_排行榜扩展): canonical-config runs only —
             90s 攀山竞速 and 递增速度 词雨. pts.week rides inside pts. */
          bestSprint90: entry.bestSprint90 || 0,
          bestRainRamp: entry.bestRainRamp || 0
        };
        db.collection("scores").doc(_uid).set(s, { merge: true })
          .catch(function (e) { console.error("saveScore failed:", e); });
      });
    },

    /* top-N board ordered by a nested field path (e.g. "g3.alt",
       "g3.totalPts", "g3.pts.2026T3"). cb(rows|null); each row: {uid, data}
       where data is the full score doc — app.js pulls the ranked value out. */
    getScoreBoard: function (fieldPath, n, cb) {
      whenReady(function () {
        db.collection("scores").orderBy(fieldPath, "desc").limit(n || 20).get()
          .then(function (qs) {
            var rows = [];
            qs.forEach(function (doc) { rows.push({ uid: doc.id, data: doc.data() || {} }); });
            cb(rows);
          }).catch(function (e) { console.error("getScoreBoard failed:", e); cb(null); });
      });
    },

    /* own rank via a server-side count (no collection read): number of docs
       strictly above myVal on fieldPath, + 1. cb(rank|null). */
    getScoreRank: function (fieldPath, myVal, cb) {
      whenReady(function () {
        try {
          db.collection("scores").where(fieldPath, ">", myVal || 0).count().get()
            .then(function (snap) { cb(((snap.data() || {}).count || 0) + 1); })
            .catch(function (e) { console.error("getScoreRank failed:", e); cb(null); });
        } catch (e) { cb(null); }
      });
    },

    /* ---------- moderation: restore log + teacher-triggered flag ----------
       (HANDOFF_dashboard_and_bound_codes.md §7). Both are fire-and-forget /
       graceful: they NEVER block or fail a restore. Until the restoreLog /
       moderation Firestore rules are published (§8e), writes/reads are denied
       and these just no-op — the rest of the app is unaffected. */

    /* append one row to the top-level restoreLog collection. entry carries the
       student's own uid implicitly (added here); required by the create rule. */
    logRestore: function (entry) {
      whenReady(function () {
        try {
          db.collection("restoreLog").add({
            uid: _uid,
            nickname: entry.nickname || "",
            school: entry.school || "",
            mtlClass: entry.mtlClass || "",
            stream: entry.stream || "",
            codeNick: entry.codeNick || "",
            matched: !!entry.matched,
            added: entry.added || 0,
            at: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(function (e) { console.error("logRestore failed:", e); });
        } catch (e) { console.error("logRestore failed:", e); }
      });
    },

    /* read this student's own moderation flag (moderation/{uid}); cb(data|null).
       Teacher writes it from the console; client only reads its own. */
    getModeration: function (cb) {
      whenReady(function () {
        try {
          db.collection("moderation").doc(_uid).get()
            .then(function (snap) { cb(snap.exists ? (snap.data() || null) : null); })
            .catch(function (e) { console.error("getModeration failed:", e); cb(null); });
        } catch (e) { cb(null); }
      });
    }
  };
})();

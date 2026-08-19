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
    /* ⚠️ A REJECTED sign-in is the easy case. The one that bit us live on
       2026-08-15 is a sign-in that neither resolves nor rejects, which is what a
       managed school network does when it blocks Google's identity endpoints:
       no error is ever thrown, so _failed stayed false, isAvailable() kept
       answering true, and every queued whenReady callback waited forever. After
       this deadline the layer reports itself unavailable so callers stop waiting
       on it. Queued callbacks are deliberately NOT dropped — if auth does land
       later they still run, and pending writes reach the cloud. */
    setTimeout(function () {
      if (!_ready) {
        _failed = true;
        console.warn("Firebase auth did not complete in 10s — running local-only.");
      }
    }, 10000);
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

    /* ---------- dockScores/{uid} : 启航码头 boards ----------
       A SEPARATE collection from scores/{uid} by design: 航程 / 航海值 must never
       merge with 海拔 / 历练值, and separate documents make an accidental join
       impossible rather than merely discouraged. Written only for
       category === "student" (xh.js gates it), and holds nothing but the
       nickname, school and the two dock figures.
       entry = { nickname, school, avatarId, sailed, pts } */
    saveDock: function (entry) {
      whenReady(function () {
        if (!_uid) return;
        db.collection("dockScores").doc(_uid).set({
          nickname: entry.nickname || "",
          school: entry.school || "",
          avatarId: entry.avatarId || "",
          sailed: entry.sailed || 0,
          pts: entry.pts || 0,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function (e) { console.error("saveDock failed:", e); });
      });
    },

    /* top rows by "sailed" or "pts"; cb(array|null), each {uid,nickname,school,avatarId,sailed,pts}.
       ⚠️ 校内 filtering is done CLIENT-SIDE on this set rather than with a
       where(school)+orderBy query, which would need a composite index the owner
       would have to create by hand. At dock scale (one pre-G1 tier) fetching the
       top 60 and filtering is cheaper than that operational step. If the dock
       ever grows past a few hundred students, the 校内 board will start missing
       people and THEN it needs the composite index. */
    topDock: function (field, cb) {
      whenReady(function () {
        var f = (field === "pts") ? "pts" : "sailed";
        db.collection("dockScores").orderBy(f, "desc").limit(60).get().then(function (qs) {
          var rows = [];
          qs.forEach(function (doc) {
            var d = doc.data() || {};
            rows.push({ uid: doc.id, nickname: d.nickname || "", school: d.school || "",
                        avatarId: d.avatarId || "", sailed: d.sailed || 0, pts: d.pts || 0 });
          });
          cb(rows);
        }).catch(function (e) { console.error("topDock failed:", e); cb(null); });
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
          bestRainRamp: entry.bestRainRamp || 0,
          /* 对战徽章 counts, published so a classmate tapping your name on the
             leaderboard can see what you have won. Compact keys (rg/rs/rb/rc =
             结伴登峰 gold/silver/bronze/称号, p* = 同伴挑战) because this rides in
             every score write. Counts only — no dates, no word data. */
          battle: entry.battle || {}
        };
        db.collection("scores").doc(_uid).set(s, { merge: true })
          .catch(function (e) { console.error("saveScore failed:", e); });
      });
    },

    /* ================= 恢复码 claims/{code} (owner 2026-08-19) =================
       owner:「is there a way for the student to enter a shorter code but still get their
       progress restored?」+「override VS3, let the students restore everything」.
       A student who changes device types ONE ten-character code instead of a long
       progress string, and gets back mastery, records AND the economy.

       ⚠️ THE DOCUMENT IS KEYED BY THE CODE, and firestore.rules explains why at length:
       a lookup by query would require `list` on users/{uid}, and Firestore rules cannot
       inspect a where-clause, so that would expose EVERY student's document. A get() of
       a document whose id you must already know has exactly the property we want.
       ⚠️ THE CODE IS A SECRET, so it must never be logged, never published to a board,
       and never derived from the uid — a derived code would be forgeable from the 8-char
       uid prefix the leaderboard already shows.
       ⚠️ WRITE CADENCE IS DELIBERATELY SLOW (callers use the session-flush path, not the
       2.5s progress debounce). Mirroring the whole store on every save would DOUBLE this
       project's Firestore write volume, and 「the state at the end of your last session」
       is the right granularity for a lost-device backup anyway.
       ⚠️ EVERY ENTRY POINT FAILS SOFT. §16 notes several rules blocks ship unpublished;
       until this one is live every call here returns permission-denied, and the app must
       carry on exactly as before rather than blocking a student who just wants to play. */
    /* ⚠️ NO 0/O/1/I/L. This code gets read off a screen and typed by an 11-year-old, and
       those five are the transcription errors that actually happen. 31 symbols ^ 10 is
       ~8×10^14, which is not the threat model anyway (see the rules file). */
    makeClaimCode: function () {
      var A = "23456789ABCDEFGHJKMNPQRSTUVWXYZ", out = "", i;
      var buf = null;
      try {
        if (window.crypto && window.crypto.getRandomValues) {
          buf = new Uint32Array(10);
          window.crypto.getRandomValues(buf);
        }
      } catch (e) { buf = null; }
      for (i = 0; i < 10; i++) {
        /* ⚠️ Math.random is the FALLBACK, not the default: it is not a CSPRNG, and this
           string is the only thing standing between a stranger and a student's account. */
        var r = buf ? buf[i] : Math.floor(Math.random() * 0xffffffff);
        out += A.charAt(r % A.length);
      }
      return out;
    },
    /* payload = the whole restore snapshot, assembled by profile.js. cb(ok) */
    saveClaim: function (code, payload, cb) {
      cb = cb || function () {};
      if (!code) { cb(false); return; }
      whenReady(function () {
        db.collection("claims").doc(code).set({
          uid: _uid, payload: payload,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: false })
          .then(function () { cb(true); })
          .catch(function (e) { console.warn("saveClaim failed:", e && e.code); cb(false); });
      });
    },
    /* cb(payload | null, reason). reason is "notfound" | "denied" | "error" so the
       restore screen can tell「打错了」from「规则还没发布」— they need different words. */
    readClaim: function (code, cb) {
      cb = cb || function () {};
      if (!code) { cb(null, "notfound"); return; }
      whenReady(function () {
        db.collection("claims").doc(code).get()
          .then(function (snap) {
            if (!snap.exists) { cb(null, "notfound"); return; }
            var d = snap.data() || {};
            cb(d.payload || null, d.payload ? "" : "error");
          })
          .catch(function (e) {
            cb(null, (e && e.code === "permission-denied") ? "denied" : "error");
          });
      });
    },
    /* rotating a code = drop the old document, then mint and save a new one. Only the
       owner may delete (rules), so a failure here is never silent data loss for anyone
       else — the old code simply keeps working until it is overwritten. */
    deleteClaim: function (code, cb) {
      cb = cb || function () {};
      if (!code) { cb(false); return; }
      whenReady(function () {
        db.collection("claims").doc(code).delete()
          .then(function () { cb(true); })
          .catch(function (e) { console.warn("deleteClaim failed:", e && e.code); cb(false); });
      });
    },

    /* ---- 意见反馈工单 (2026-08-14) ----
       The ticket ID carries the rate limit (see firestore.rules): the client
       tries slot 0..4 for today and stops at the first that succeeds. A slot
       that already exists fails with "already-exists", which IS the daily cap
       being hit — that is reported as a friendly message, not an error. */
    submitFeedback: function (payload, cb) {
      whenReady(function () {
        var day = payload.day, slot = 0, max = payload.max || 20;
        /* `max` is a client-side hint for how many slots to try — it must not be
           written into the ticket. Firestore throws on an undefined value, so the
           key is deleted rather than blanked. */
        delete payload.max;
        function tryNext() {
          if (slot >= max) { cb({ ok: false, reason: "cap" }); return; }
          var id = _uid + "__" + day + "__" + slot;
          var doc = Object.assign({}, payload, {
            uid: _uid, status: "new",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          db.collection("feedback").doc(id).set(doc, { merge: false })
            .then(function () { cb({ ok: true, id: id, slot: slot }); })
            .catch(function (e) {
              /* create is blocked on an existing doc by the rules, so a taken
                 slot surfaces as permission-denied rather than already-exists */
              if (e && (e.code === "already-exists" || e.code === "permission-denied")) {
                slot++; tryNext(); return;
              }
              cb({ ok: false, reason: (e && e.code) || "error" });
            });
        }
        tryNext();
      });
    },
    /* a student's own tickets, so the panel can show their status */
    myFeedback: function (cb) {
      whenReady(function () {
        db.collection("feedback").where("uid", "==", _uid).limit(20).get()
          .then(function (qs) {
            var rows = []; qs.forEach(function (d) { rows.push(Object.assign({ id: d.id }, d.data())); });
            cb(rows);
          }).catch(function () { cb(null); });
      });
    },
    /* teacher queue. No orderBy: createdAt is a serverTimestamp and is briefly
       null on a freshly written doc, which would drop the newest ticket from an
       ordered query — the dashboard sorts client-side instead. */
    listFeedback: function (n, cb) {
      whenReady(function () {
        db.collection("feedback").limit(n || 300).get()
          .then(function (qs) {
            var rows = []; qs.forEach(function (d) { rows.push(Object.assign({ id: d.id }, d.data())); });
            cb(rows);
          }).catch(function (e) { console.error("listFeedback failed:", e); cb(null); });
      });
    },
    setFeedbackStatus: function (id, status, note, who, cb) {
      whenReady(function () {
        db.collection("feedback").doc(id).update({
          status: status, note: note || "", handledBy: who || "",
          handledAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () { cb(true); }).catch(function (e) { console.error("setFeedbackStatus:", e); cb(false); });
      });
    },
    /* the student's own daily quota (absent doc = the default). One read when
       the form opens, so it can show an honest "N left today" and stop trying
       slots the rules would refuse anyway. */
    myFeedbackQuota: function (cb) {
      whenReady(function () {
        db.collection("feedbackQuota").doc(_uid).get()
          .then(function (d) { cb(d.exists && typeof d.data().max === "number" ? d.data().max : null); })
          .catch(function () { cb(null); });
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

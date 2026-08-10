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
    }
  };
})();

# 词山学海 · 管理员操作说明 (ADMIN)

Not student-facing. Teacher dashboard (`teacher.html`), Firestore rules, moderation, onboarding.
Built from HANDOFF_dashboard_and_bound_codes.md §7-8. (Kept out of the public README on purpose;
move it in if you prefer, per the handoff.)

## 1. Publish the Firestore rules (do this FIRST)

The full ruleset is in `firestore.rules`. Firebase console → Firestore Database → Rules → paste
the whole file → Publish.

⚠️ IMPORTANT correction to the handoff: the handoff §8e ruleset does NOT contain a `scores/{uid}`
block, but the in-app leaderboard (词山风云榜) reads and writes `scores/{uid}`. Replacing the rules
with §8e verbatim would BREAK the leaderboard. `firestore.rules` in this repo keeps the `scores`
rule alongside the §8e blocks. Use `firestore.rules`, not the handoff text verbatim.

Until these rules are published:
- The leaderboard shows 加载失败 (scores read denied).
- Restores still work locally, but the restore log is not saved (console shows
  "logRestore failed: permission-denied" — harmless).
- teacher.html cannot read anything.

### Verify in the Rules Playground before relying on it (handoff §10, tests 9-17)
1. Anonymous UID reading its OWN `users/{uid}`: allowed.
2. Anonymous UID reading a DIFFERENT UID's `users`: denied. ← students cannot read each other.
3. Anonymous UID reading `restoreLog`: denied.
4. Anonymous UID writing its own `moderation`: denied.
5. Teacher UID (active:true) reading any `users`: allowed.
6. Teacher UID (active:false) reading any `users`: denied. ← revocation actually revokes.
7. Teacher role "teacher" writing `moderation`: denied.
8. Teacher role "hod" writing `moderation`: allowed.
9. Any client writing to `teachers`: denied.

## 2. Enable teacher sign-in (one-time)

1. Console → Authentication → Sign-in method: enable Email/Password. LEAVE Anonymous enabled
   (students depend on it).
2. Authentication → Settings → Authorized domains: confirm `btvssclunit.github.io` is listed
   (else sign-in fails silently on the live site).

## 3. Create the owner's own HOD account first (needed to test the rules)

1. Console → Authentication → Users → Add user. Enter your email + any temporary password.
2. Copy the UID shown in the user row.
3. Firestore → collection `teachers` → new document, document ID = that UID, fields:
   ```
   name: "郑凯欣"
   email: "..."
   school: "百德中学"
   role: "hod"        // "hod" | "teacher"  — only "hod" may write moderation
   active: true       // set false to revoke access without deleting the record
   ```
4. Open `teacher.html`, use 忘记密码 to set your own password by email, then log in.

Each teacher gets their OWN account (never a shared login) — individual accounts can be revoked
one at a time and moderation actions are attributable. To onboard another teacher: repeat steps
1-3 with role "teacher", send them the `teacher.html` link, ask them to use 忘记密码.

`teachers` is never client-writable — it is the root of trust, maintained in the console only.

Caveat to remember: signing into `teacher.html` in the SAME browser replaces that browser's
anonymous student session, orphaning its cloud backup (localStorage progress is unaffected). Use a
separate browser profile / incognito window for teacher work if you also test student flows.

## 4. What teacher.html shows

Load is manual (a button, no auto-refresh — protects the free-tier read quota; add pagination past
~1000 docs). Views:
- 概览: total profiles by category and by school (reach tracking).
- 班级视图: filter by school + class; per-student mastered counts per stream; sortable.
- 词语难点: words mastered by the fewest students in the filtered set. ⚠️ Low mastery can mean
  "not yet attempted", not "hard" — there is currently no per-word error data, only the mastered
  map. Read it alongside classroom judgement.
- 恢复记录: the restore log, newest first; rows where a student adopted someone else's nickname
  are flagged red.
- 处理 (HOD only): write a `moderation/{uid}` record.

## 5. Moderation: honest limits

A moderation record (`moderation/{uid}` = {action:"zero", stream, at, note}) takes effect only
when that student next opens the app ONLINE on that device; it clears that one stream's progress.
This is a social/attribution tool, not a hard block:
- A student who clears browser storage gets a NEW anonymous UID and loses ALL their progress
  anyway, so evading the reset costs them exactly what the reset costs them.
- The handoff's `rollback`-to-a-saved-snapshot idea is NOT implemented: under the published rules
  students cannot read `restoreLog`, so the client cannot fetch a pre-restore snapshot. The
  workable action is `zero` (clear the stream). The pre-restore snapshot only exists in the
  student's own sessionStorage for a same-session 撤销恢复.
- Client enforcement of moderation on boot is NOT wired yet (see CLAUDE.md "DEFERRED"): a local
  zero would be re-added by the cloud union on the same load, so it must be built together with a
  matching cloud wipe. Deferred deliberately.

## 6. Two decisions still yours (handoff §8g) — I used the handoff's recommended defaults

1. IDENTIFIABILITY. No real names are collected, so the dashboard shows nicknames only; a teacher
   cannot tell which student is which unless the student reports their own nickname. DEFAULT USED:
   pseudonymous (no index-number field added), which the handoff recommends. If you want records to
   be properly identifiable, we can add an optional index-number field — a meaningfully larger
   privacy step; tell me and I'll add it.
2. CROSS-SCHOOL VISIBILITY. The site is public, so other schools may accumulate profiles. DEFAULT
   USED: teachers can read across all schools (the §8e rules as written), and teacher.html has a
   school filter so you can scope your own view. If you want to hard-limit teacher reads to 百德中学
   in the rules themselves, tell me and I'll tighten `firestore.rules`.

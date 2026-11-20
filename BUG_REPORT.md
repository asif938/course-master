# ForegX / CourseMaster — Bug Report

Projects: `frontend/` (React + Vite + Redux) and `backend/` (Express 5 + MongoDB).
Method: code review of both repos, then local verification — 28 automated API checks against a live local backend + Atlas test database, and manual browser checks of the frontend. Where a fix was only checked by code review and a clean `vite build`, the status says so.

Priority guide: P1 fix immediately · P2 ASAP · P3 after higher priorities · P4 low urgency.

## Summary

| Severity | Count |
|---|---|
| Critical | 6 |
| High | 9 |
| Medium | 9 |
| Low | 7 |
| **Total** | **31** |

All 31 are fixed. 24 are marked Fixed & Verified (API tests or browser); 7 are fixed but only checked by code review/build or partially (marked "Fixed" below).

---

## Authentication & Authorization

**1. Bug ID & Title:** BUG-001 — Login never persists the session
**2. Location & Steps:** Login page → enter valid credentials → Sign In. (Frontend `utils/auth.js`)
**3. Expected vs Actual:** User should stay logged in and reach dashboard. Actual: token saved under `user_token` but read from `token`, so every protected page bounces back to /login.
**4. Severity & Evidence:** Critical (P1). `saveToken` → `localStorage.setItem("user_token")`, `getToken` → `getItem("token")`.
**5. Fix & Status:** Single `TOKEN_KEY` constant used by save/get/clear. Browser check: after login `token` is set and `/student` loads. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-002 — Login compares password to hash as plain text
**2. Location & Steps:** `POST /api/auth/login` with correct credentials (e.g. admin@coursemaster.com / admin123).
**3. Expected vs Actual:** Should return a token. Actual: `password === user.passwordHash` is always false for bcrypt hashes → "Invalid email or password".
**4. Severity & Evidence:** Critical (P1). `backend/src/services/auth.service.js`.
**5. Fix & Status:** Use `bcrypt.compare`. API test: correct password → 200 + token, wrong password → 400. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-003 — Invalid or expired JWT is accepted by the auth middleware
**2. Location & Steps:** `GET /api/auth/me` with `Authorization: Bearer garbage`.
**3. Expected vs Actual:** 401. Actual: middleware called `next()` in its catch block, so the request continued with `req.user` undefined (500/inconsistent behaviour on every protected route).
**4. Severity & Evidence:** Critical (P1, security). `backend/src/middlewares/authMiddleware.js`.
**5. Fix & Status:** Respond `401 Invalid or expired token`. API tests: bad token → 401 on `/auth/me` and `/admin/analytics`; no token → 401. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-004 — "Dev bypass" backdoor with hard-coded admin/student JWTs
**2. Location & Steps:** Login page → "Dev Bypass" buttons (also `?bypass=true` or `localStorage.dev_bypass=true` on any protected route).
**3. Expected vs Actual:** Protected pages must require a real login. Actual: anyone could skip authentication and open /admin and /student; tokens were committed in source.
**4. Severity & Evidence:** Critical (P1, security). `Login.jsx`, `ProtectedRoute.jsx`, `Navbar.jsx`.
**5. Fix & Status:** Removed the buttons, the bypass checks and the navbar portal links. Browser: login page renders without the block; visiting /student with no token redirects to /login. **Fixed & Verified.** (Note: the embedded tokens remain in git history — rotate `JWT_SECRET` on any deployed environment.)

**1. Bug ID & Title:** BUG-005 — Protected routes let users in when token validation fails
**2. Location & Steps:** Store any junk string as `token` in localStorage → open /student.
**3. Expected vs Actual:** Redirect to /login. Actual: `.catch` set `isValid = !!token` → access granted.
**4. Severity & Evidence:** High (P2). `routes/ProtectedRoute.jsx`.
**5. Fix & Status:** Any failure of `GET /auth/me` → redirect to /login; no-token redirects immediately; stale responses ignored. **Fixed & Verified** (no-token path verified in browser; failing-token path verified at API level via BUG-003).

**1. Bug ID & Title:** BUG-006 — Admin registration key is not enforced; service trusts a `role` argument
**2. Location & Steps:** Register with `adminKey` set to the correct / wrong key.
**3. Expected vs Actual:** Correct key (`ADMIN_REGISTRATION_KEY`) → admin; wrong key → error; role never client-controlled (per README). Actual: `adminKey` was ignored entirely, and the service accepted `role` straight from its input.
**4. Severity & Evidence:** High (P2). `auth.service.js` comment "user can pass role directly without adminKey verification".
**5. Fix & Status:** Role is derived server-side only; admin requires matching env key. API tests: `role:"admin"` in body → student; wrong key → 400; right key → admin. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-007 — Banned users can still log in
**2. Location & Steps:** Admin → Manage Users → Ban a user → that user logs in.
**3. Expected vs Actual:** Login blocked. Actual: `isBanned` never checked.
**4. Severity & Evidence:** High (P2).
**5. Fix & Status:** Login rejects banned accounts ("Your account has been banned"). API test passes. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-008 — Any user can change another user's course progress (IDOR)
**2. Location & Steps:** `PATCH /api/enrollments/:enrollId/complete-lesson` with another student's enrollment id.
**3. Expected vs Actual:** Only the owner may update. Actual: enrollment looked up by id only.
**4. Severity & Evidence:** High (P2, security).
**5. Fix & Status:** Lookup scoped to `{_id, student: req.user.id}`; `lessonId` required. API test: other user → 400. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-009 — Admin dashboard blank forever / not role-checked when `/auth/me` fails
**2. Location & Steps:** Open /admin with an invalid token.
**3. Expected vs Actual:** Redirect to login. Actual: `AdminRoute` returned `null` (white page) while `me` was null, including after failure.
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** Spinner while loading, redirect to /login on failure, redirect non-admins to /student. Browser: student opening /admin/users lands on /student. **Fixed & Verified.**

## Enrollment, Progress & Quizzes

**1. Bug ID & Title:** BUG-010 — Enrollment logic inverted: new students can never enroll
**2. Location & Steps:** Course details → Enroll Now (or `POST /api/enrollments/:courseId`).
**3. Expected vs Actual:** First enrollment succeeds, duplicates rejected. Actual: threw "Already enrolled" when *not* enrolled, so enrollment was impossible.
**4. Severity & Evidence:** Critical (P1). `enrollment.service.js`.
**5. Fix & Status:** Condition corrected. API tests: first enroll 201, duplicate 400. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-011 — "My enrollments" always empty after load
**2. Location & Steps:** Log in → Student Dashboard.
**3. Expected vs Actual:** Enrolled courses listed. Actual: reducer stored `action.payload.data` (undefined) instead of the array → `enrollments.length` crash/empty list.
**4. Severity & Evidence:** Critical (P1). `enrollmentSlice.js`.
**5. Fix & Status:** Store `action.payload`. Browser: dashboard lists the 2 seeded enrollments. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-012 — Lesson completion not saved reliably (missing `await`)
**2. Location & Steps:** Course player → Mark as Complete.
**3. Expected vs Actual:** Progress persisted before response. Actual: `enrollment.save()` not awaited → response returned before save, errors swallowed, stale data on refetch.
**4. Severity & Evidence:** High (P2).
**5. Fix & Status:** `await enrollment.save()`. API test: progress 100% persists on re-fetch. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-013 — Quiz score percent is 10× too small
**2. Location & Steps:** Submit a quiz with all answers correct.
**3. Expected vs Actual:** 100%. Actual: `(score/total)*10` → 10%.
**4. Severity & Evidence:** High (P2).
**5. Fix & Status:** Multiply by 100. API test: all correct → 100, all wrong → 0. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-014 — Batch enrollment sends array index instead of batch id
**2. Location & Steps:** Course details → select "Batch 2" → Enroll.
**3. Expected vs Actual:** Enrollment with that batch. Actual: sent `"1"` → Mongoose CastError → "Failed to enroll".
**4. Severity & Evidence:** High (P2). `CourseDetails.jsx`.
**5. Fix & Status:** Send `batches[i]._id`. API test: enrolling with real batch `_id` → 201. **Fixed** (backend path verified; UI click-through not exercised).

**1. Bug ID & Title:** BUG-015 — Quiz radio buttons share one group name
**2. Location & Steps:** Course player → quiz with 2+ questions → keyboard-navigate / select.
**3. Expected vs Actual:** Each question independent. Actual: all inputs `name="quiz-option"` → one native group (arrow keys jump between questions).
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** Name per question. Browser: 2 distinct groups. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-016 — Assignment status badge shows raw "submitted"
**2. Location & Steps:** Course player → submitted assignment.
**3. Expected vs Actual:** "Pending Review". Actual: component checked `"pending"` but API uses `"submitted"`.
**4. Severity & Evidence:** Low (P4).
**5. Fix & Status:** Map `submitted` to "Pending Review". **Fixed** (code review + build only).

## Courses & Course Player UI

**1. Bug ID & Title:** BUG-017 — Course price displayed ×100
**2. Location & Steps:** Open any course details page.
**3. Expected vs Actual:** ৳ 5,000. Actual: `course.price * 100` → ৳ 500000.
**4. Severity & Evidence:** High (P2).
**5. Fix & Status:** Show `price.toLocaleString()`. Browser: shows ৳ 5,000. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-018 — Video player iframe fixed at 300×700px
**2. Location & Steps:** Course player → any lesson with video.
**3. Expected vs Actual:** Responsive 16:9 player. Actual: narrow portrait box, broken layout.
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** `aspect-video w-full`. Browser: 572×322. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-019 — "Completed ✓" state never shown for finished lessons
**2. Location & Steps:** Open a lesson already completed.
**3. Expected vs Actual:** Button shows Completed and is disabled. Actual: `completedLessons.includes(lessonObject)` compared an object with ids → always false.
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** Compare string ids. Browser: shows "Completed ✓", disabled, sidebar tick. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-020 — Dashboard progress shows NaN% / Infinity%
**2. Location & Steps:** Student Dashboard before expanding "Details".
**3. Expected vs Actual:** Server-computed progress (e.g. 25%). Actual: `completed / undefined` → NaN%.
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** Use `enrollment.progress.percent`. Browser: 0% and 25%. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-021 — Courses page: repeated / stale requests
**2. Location & Steps:** Courses page → type in Category/Tags, or search.
**3. Expected vs Actual:** One request per change, results match current filters. Actual: a request per keystroke, duplicate fetch from separate effects, and search used a stale page value.
**4. Severity & Evidence:** Medium (P3, performance).
**5. Fix & Status:** Debounced category/tags, single fetch effect with cancellation, search applied on submit. **Fixed** (browser: loads normally; typed-filter behaviour reviewed in code).

**1. Bug ID & Title:** BUG-022 — Long course titles overflow the card; invalid HTML nesting
**2. Location & Steps:** Courses page / home preview with long title.
**3. Expected vs Actual:** Title wraps inside the card. Actual: `whitespace-nowrap overflow-visible`; also `<div>` inside `<p>` (React DOM-nesting warning).
**4. Severity & Evidence:** Low (P4).
**5. Fix & Status:** `break-words line-clamp-2`; `<p>` → `<div>`. Browser: no title overflows its card. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-023 — "Batch selected" hint hidden for the first batch
**2. Location & Steps:** Course details → select the first batch.
**3. Expected vs Actual:** Hint shown. Actual: `{selectedBatchId && …}` is falsy for index 0.
**4. Severity & Evidence:** Low (P4).
**5. Fix & Status:** `!== null` check. **Fixed** (code review + build only).

## Navigation & Layout

**1. Bug ID & Title:** BUG-024 — Every navbar link is highlighted as active
**2. Location & Steps:** Any page → look at Home / Courses / Dashboard.
**3. Expected vs Actual:** Only the current page highlighted. Actual: `window.location.pathname.startsWith("/")` is always true.
**4. Severity & Evidence:** Low (P4).
**5. Fix & Status:** Use NavLink's `isActive`. Browser: only "Dashboard" active on /student. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-025 — Mobile menu clipped
**2. Location & Steps:** Narrow viewport → hamburger.
**3. Expected vs Actual:** All items visible. Actual: `max-h-32 overflow-hidden` hides Dashboard / Login / Logout.
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** `max-h-[80vh] overflow-y-auto`. **Fixed** (code review + build only).

**1. Bug ID & Title:** BUG-026 — "Profile" menu link goes to a non-existent page
**2. Location & Steps:** Logged in → avatar menu → Profile.
**3. Expected vs Actual:** A profile page. Actual: 404 (no route exists).
**4. Severity & Evidence:** Low (P4).
**5. Fix & Status:** Removed the dead link (desktop + mobile). **Fixed** (code review + build only).

**1. Bug ID & Title:** BUG-027 — Admin sidebar has no link to "Manage Courses"
**2. Location & Steps:** /admin → sidebar.
**3. Expected vs Actual:** Link to course list. Actual: missing; only reachable by typing the URL.
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** Added the item. **Fixed** (code review + build only).

## Backend API / Data

**1. Bug ID & Title:** BUG-028 — CORS preflight methods restricted to GET, POST
**2. Location & Steps:** Browser app on another origin → admin PATCH/DELETE (edit/delete course, ban user).
**3. Expected vs Actual:** PATCH/DELETE allowed. Actual: custom middleware overwrote `Access-Control-Allow-Methods` with `GET, POST`.
**4. Severity & Evidence:** High (P2). `backend/app.js`.
**5. Fix & Status:** Removed the middleware (the `cors()` package already sets correct values). API test: OPTIONS preflight allows PATCH and DELETE. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-029 — Admin assignments filter uses a non-existent field
**2. Location & Steps:** `GET /api/admin/assignments?courseId=…`
**3. Expected vs Actual:** Only that course's submissions. Actual: filtered on `courseId` (schema field is `course`) and controller never forwarded the query → filter ignored / returned nothing.
**4. Severity & Evidence:** Medium (P3).
**5. Fix & Status:** Filter on `course`; forward `req.query`. API tests: course1 → 1, course3 → 0. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-030 — Course search crashes / is unsafe with regex characters
**2. Location & Steps:** `GET /api/courses?search=([`
**3. Expected vs Actual:** Literal search, empty result. Actual: invalid regex → 400 error; crafted patterns can cause ReDoS.
**4. Severity & Evidence:** Low (P4).
**5. Fix & Status:** Escape regex metacharacters. API test: `([` → 200. **Fixed & Verified.**

**1. Bug ID & Title:** BUG-031 — Auth header sent without `Bearer` scheme
**2. Location & Steps:** Any authenticated request.
**3. Expected vs Actual:** `Authorization: Bearer <token>`. Actual: raw token (worked only because backend tolerated both).
**4. Severity & Evidence:** Low (P4).
**5. Fix & Status:** Axios interceptor sends `Bearer <token>`; verified by every authenticated browser/API call above. **Fixed & Verified.**

---

## Not covered / known limits (Unresolved)

- Admin screens (Create/Edit Course, Video Classes, Overview, Analytics, Manage Users, Assignment review) were read through but not clicked through in the browser; no defects found there beyond those listed.
- The live deployed site was not tested; all verification was local.
- No screenshots are embedded in this file; evidence is given as source locations and test output (see `api-test` results: 28 passed, 0 failed).
- Pre-existing ESLint warnings unrelated to these bugs remain (unused variables in `CoursesPreview.jsx` and `CoursePlayer.jsx`).

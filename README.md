# UsSpace

A private, mobile-first progressive web app for exactly two people in a long-distance relationship. Both partners share one couple space: statuses, love notes, decisions, date plans, memories, and manually shared map pins stay in sync.

The app lives in this `usspace` folder so it does not replace the other projects in the parent workspace.

## Run locally

```bash
cd usspace
npm install
cp .env.example .env
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`). Leave `.env` empty to use demo mode.

Production build:

```bash
npm run build
npm run preview
```

## Demo mode and Firebase

If `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` are missing, UsSpace stays in **demo mode**. The welcome screen says so.

Demo mode stores the couple in `localStorage` on that browser and uses a `BroadcastChannel` so two tabs can act as the two partners. Passwords and the optional PIN are hashed with SHA-256 and a salt. They are never stored in plain text. Demo mode does not sync between two phones. Add Firebase when you want that.

## Firebase setup

Use the free Spark plan. No credit card is required.

1. Create a project at [Firebase console](https://console.firebase.google.com).
2. Build → Authentication → Sign-in method → enable **Email/Password**.
3. Build → Realtime Database → Create database. Start in **locked mode**. Choose a region close to both of you. Copy the database URL.
4. Project settings → Your apps → Web app → register it and copy the config.
5. Put the values in `.env` (see `.env.example`). Restart `npm run dev`.
6. Realtime Database → Rules → paste `firebase/database.rules.json`, or deploy with the Firebase CLI:

```bash
npx firebase-tools deploy --only database --project YOUR_PROJECT_ID
```

`firebase.json` already points at `firebase/database.rules.json`. Do not enable Firebase Storage. Photos use an `https` link or a compressed image kept inside the database.

The web API key is visible in the built JavaScript. That is normal for Firebase web apps. Privacy comes from Authentication plus the database rules, not from hiding the key.

## Database shape

```
users/{uid}
  displayName, email, photoURL, coupleId
  pinHash, pinSalt          # optional app lock, not the login
  theme, darkMode, locationSharing

invitations/{CODE}
  coupleId, createdBy, expiresAt

couples/{coupleId}
  ownerId, partnerId, createdAt, inviteCode
  profiles/{uid}
  settings/
    relationshipStartDate, nextMeetingDate
    statusOptions/{id}
  statuses/{uid}
  loveNotes/{id}
  decisions/
    votes/{itemId}/{uid}
    matches/{itemId}
    wheel/options/{id}
    wheel/lastResult
    coin/sideA, sideB, lastFlip
  activities/{id}
  checklist/{id}
  memories/{id}
  locations/{uid}           # only after Ping my spot
  presence/{uid}
```

Empty strings are stored instead of `null` for dates, because Realtime Database deletes a key when its value is `null`.

An invitation code is 8 characters, skips ambiguous letters, and expires after 30 days. Creating a space writes the owner and no partner. Joining sets `partnerId` in a transaction. A third person is refused. The owner cannot leave while a partner is still in the space; the partner leaves first.

## Security rules

Rules are in `firebase/database.rules.json`.

- The database root is closed.
- A user can read and write only `users/{their uid}`.
- Any signed-in person can read one invitation code they already know. They cannot list every code.
- Only the creator can write or delete that invitation.
- A couple can be read only by its owner or its partner.
- Only the owner can create the couple, and it starts without a partner.
- A signed-in person can set `partnerId` only when it is empty, and only to themselves.
- `ownerId` cannot be changed afterward.
- The partner can update shared data and can remove themselves. They cannot delete the space or replace the owner.
- Deleting a user, an invitation, or an empty couple is allowed. A couple that still exists must keep an `ownerId`.

The optional PIN only locks the screen on that device. Logging out is still available from the lock screen. Firebase Authentication is the real sign-in.

## Environment variables

Copy `.env.example` to `.env`.

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_FIREBASE_PROJECT_ID` | Project id |
| `VITE_FIREBASE_APP_ID` | Web app id |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional, unused by the app |
| `VITE_FIREBASE_STORAGE_BUCKET` | Optional, unused. Storage is not used |
| `VITE_BASE` | `/` on Vercel. `/repository-name/` on a GitHub project site |

## Deploy for free

The router is a hash router (`/#/together`), so GitHub Pages and Vercel do not need rewrite rules.

### Vercel

1. Import the repository and set the root directory to `usspace` if the repo contains other projects.
2. Framework preset: Vite. Build command: `npm run build`. Output: `dist`.
3. Add the `VITE_FIREBASE_*` variables. Set `VITE_BASE` to `/`.
4. Deploy. The Spark plan and Vercel hobby plan are enough.

### GitHub Pages

```bash
# from usspace, with the repo name filled in
VITE_BASE=/your-repo-name/ npm run build
```

Push the `dist` folder to the `gh-pages` branch, or let an Action publish `usspace/dist`. In the repository settings, serve Pages from that branch. Open `https://you.github.io/your-repo-name/`.

Install from the deployed HTTPS URL. Service workers do not register on insecure origins other than localhost.

## Install on a phone

The installed app opens full screen with the name UsSpace, theme colour `#FFD6E7`, and background `#FFF8F0`.

**Android (Chrome):** open the site → menu → **Install app** or **Add to Home screen**.

**iPhone (Safari):** open the site in Safari → Share → **Add to Home Screen**. Chrome on iOS cannot install a home-screen web app. After iOS updates, the service worker updates on the next launch.

Settings inside the app repeats these steps. If the connection is gone before the app has been opened once, the offline page explains that the shared space cannot refresh. Realtime Database is not cached for offline writing.

## Testing with both partners

1. Partner A creates an account, then creates a space, and copies the invitation code.
2. Partner B creates a different account and joins with that code. Home shows both names.
3. A third account that enters the same code sees “This space already has two people.”
4. A changes status and sends a love note. B sees both without refreshing.
5. On Together, both like the same card. The match screen appears for both.
6. Spin the wheel and flip the coin. The latest result shows on the other phone.
7. Add a date idea, check a checklist item, and schedule a virtual date.
8. On Our Map, each person presses **Ping my spot** and allows location once. Distance appears only after both pins exist. Delete my pin removes only that person’s pin. Turning sharing off removes it too.
9. Add a memory with a title, date, and either an image link or a small photo.
10. Change the meeting date, theme, and dark mode. Confirm the other phone updates.
11. Set a PIN, reload, unlock, then log out from the lock screen.
12. Partner B leaves the space. Partner A can then leave or delete the account. Deleting asks you to type `delete`.

In demo mode, use two tabs in the same browser instead of two phones. Log out between accounts if you only have one tab.

## Free-tier limits

- Firebase Spark: email/password auth, 1 GB Realtime Database storage, about 10 GB downloaded per month, and 100 simultaneous connections. Two people stay inside this easily. Large photo data URLs count toward the 1 GB, so prefer image links for big pictures. The app compresses an uploaded photo to a JPEG under roughly 150,000 characters.
- Firebase Storage is not used, so there is no storage billing.
- OpenStreetMap tiles and Open-Meteo weather are free and need no key. Be gentle with them; the map loads tiles as you pan, and weather is requested when a pin exists.
- Vercel hobby and GitHub Pages are enough. No App Store or Play Store.
- The optional PIN is not a second password. Someone with the email and password can still sign in.
- Location is sent only when someone presses Ping my spot. The app does not watch the GPS in the background and does not invent coordinates if permission is denied or the request times out.
- Google Fonts are loaded from the network. The app still renders with system fonts if they fail.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local app |
| `npm run build` | Typecheck and production build, including the service worker |
| `npm run preview` | Serve the production build |
| `npm run lint` | Oxlint |

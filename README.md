# UsSpace

UsSpace is a private app for exactly two people in a long-distance relationship. It is the shared little space you both open on your phones when you are in different cities: a mood, a note, a plan, a memory, and the days until you are in the same room.

It is a progressive web app. There is no App Store or Play Store. Each person opens the site in the phone browser and can add it to the home screen so it opens full screen, like an installed app. The live site is [usspace-omega.vercel.app](https://usspace-omega.vercel.app).

## What the two of you share

One couple space belongs to two accounts only. The first person creates the space and gets an 8-character invitation code that lasts 30 days. The second person creates their own account and joins with that code. A third person is refused. After that, what either of you writes shows up on the other phone without refreshing.

Each person signs in with email and password. The password is never stored in the database. An optional PIN only locks the app on that phone. Logging out is still available from the lock screen.

You can each choose **English** or **Bahasa Malaysia**. That choice changes your own screen. Your partner can use the other language. Words you type, such as a note or a memory title, stay exactly as written. Built-in labels, such as the date-idea catalog, are translated when they are shown.

Photos are chosen from the phone, not pasted as links. A profile photo can be zoomed and moved before it is saved. The picture is shrunk to a small JPEG and kept in the private database. Firebase Storage is not used.

## The screens

**Home** is the daily check-in. It shows both names, whether the other person is here, how long you have been together, and a countdown to the next meeting. Each person sets a mood, such as missing you or free to call. A short love note left here appears for both of you.

**Together** is for deciding as a pair. This or That is a deck of cards you swipe or tap. When you both like the same card, it becomes a match. Spin the wheel or flip a coin when you cannot choose, and the result is saved for both phones.

**Activities** holds date ideas and a shared checklist. You can add your own idea, take a suggestion, mark one as a favourite, schedule it, and tick it off when it is done.

**Our Map** shows where you each chose to stand. A spot is sent only when someone taps **Ping my spot** and allows location once. UsSpace does not follow either phone in the background. After both spots exist, the page shows the distance between you, and the weather at each pin when it is available.

**Memories** is a scrapbook only the two of you can open. A memory has a title, a date, a few words, and an optional photo from the phone.

**Settings** is where each person edits their own name and photo, picks a colour theme or dark mode, chooses a language, and manages the PIN. Location sharing can be turned off, which also removes that person’s last pin. Either person can log out. Leaving the space and deleting an account are separate, and deleting asks you to type `delete` or `padam`.

## How it stays private

Only the two signed-in members can read the couple space. Invitation codes cannot be listed. Location, notes, votes, plans, and memories are shared with your partner and with no one else. The map uses OpenStreetMap. Weather, when a pin exists, comes from Open-Meteo. Neither service needs an account.

## Run locally

```bash
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

If `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` are missing, UsSpace stays in **demo mode**.

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

`firebase.json` already points at `firebase/database.rules.json`. Do not enable Firebase Storage. Photos are chosen from the phone and stored as small JPEG images inside the database.

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

1. Import this repository. The app is the repository root.
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
9. Add a memory with a title, a date, a few words, and an optional photo from the phone.
10. Change the meeting date, theme, and dark mode. Confirm the other phone updates.
11. Set a PIN, reload, unlock, then log out from the lock screen.
12. Partner B leaves the space. Partner A can then leave or delete the account. Deleting asks you to type `delete`.

In demo mode, use two tabs in the same browser instead of two phones. Log out between accounts if you only have one tab.

## Free-tier limits

- Firebase Spark: email/password auth, 1 GB Realtime Database storage, about 10 GB downloaded per month, and 100 simultaneous connections. Two people stay inside this easily. Photos count toward the 1 GB, so the app compresses each one to a JPEG before saving. A profile photo is kept smaller than a memory photo.
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

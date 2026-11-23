# UsSpace

A private companion for exactly two people in a long-distance relationship.

# What is UsSpace?

UsSpace is a mobile-first progressive web app that gives one couple a shared space on both phones. It keeps a mood, a note, a plan, a memory, and the days until you are in the same room, without an App Store or Play Store.

# Project Description

UsSpace is built for two people who live in different places and still want one private room between them. Traditional chat apps mix the couple into a general inbox. UsSpace is only the two of you: one person creates a space, the other joins with an invitation code, and a third person is refused. Statuses, love notes, decisions, date plans, memories, and map pins stay in sync while both phones are signed in.

Each person can use English or Bahasa Malaysia. That choice changes only their screen. Words they type stay as written. Photos are chosen from the phone, and a profile photo can be zoomed and moved before it is saved.

## What it does

- Signs each person in with email and password, then pairs exactly two accounts with an 8-character invitation code.
- Shows both names, time together, a meeting countdown, moods, and a daily love note on Home.
- Lets the couple swipe This or That cards, spin a wheel, and flip a coin, then keeps the shared result.
- Holds date ideas and a checklist both people can add, schedule, favourite, and tick off.
- Shares a map pin only when someone taps Ping my spot. It does not track the phone in the background.
- Shows the distance between the two pins, and the weather at each pin when it is available.
- Keeps a private scrapbook of memories with a title, a date, a few words, and an optional photo.
- Lets each person set their own language, colour theme, dark mode, profile photo, and an optional screen PIN.
- Installs on a phone from the browser: Android Chrome, or iPhone Safari, then Add to Home Screen.

## Stack

| Layer | Technology |
| --- | --- |
| App | React 19, TypeScript, Vite |
| UI | Tailwind CSS, Lucide, Framer Motion |
| Routing | React Router, hash routes so a static host needs no rewrites |
| Auth and data | Firebase Authentication and Realtime Database |
| Map | Leaflet and OpenStreetMap |
| Weather | Open-Meteo, requested only when a pin exists |
| Photos | Compressed JPEG stored in the database. Firebase Storage is not used |
| Install | Progressive web app with a service worker and offline page |
| Hosting | Vercel |

## Setup

Prerequisites: Node.js and a free Firebase project if both phones should sync. Leave the Firebase values empty to try the app in demo mode on one browser.

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL Vite prints, usually `http://127.0.0.1:5173`.

Fill `.env` from the Firebase web app config:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_BASE=/
```

In the Firebase console, enable Email/Password sign-in, create a Realtime Database in locked mode, and publish the rules in `firebase/database.rules.json`. Do not enable Firebase Storage. Restart `npm run dev` after changing `.env`.

Production build:

```bash
npm run build
npm run preview
```

## Architecture and data flow

1. The phone opens the web app. Hash routes such as `/#/together` load the matching screen.
2. Firebase Authentication signs the person in. The password is never written to the database.
3. Creating a space writes the owner and an invitation. Joining sets the partner in a transaction, and only when the seat is empty.
4. The app listens to `couples/{id}`. A note, vote, checklist tick, memory, or pin from one phone updates the other phone.
5. Profile photos and memory photos are compressed in the browser, then saved as small images on that same couple record.
6. Our Map asks for GPS only after Ping my spot. OpenStreetMap draws the pins. Open-Meteo adds weather for those coordinates.

The database root is closed. A person can read a couple only if they are the owner or the partner. Invitation codes cannot be listed. The optional PIN locks the screen on that phone. The email login is the real lock.

## Live demo

https://usspace-omega.vercel.app

On Android, open that link in Chrome and choose Install app or Add to Home screen. On iPhone, open it in Safari, tap Share, then Add to Home Screen.

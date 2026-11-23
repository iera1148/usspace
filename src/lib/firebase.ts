import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let database: Database | null = null

export function getFirebaseAuth() {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured yet.')
  if (!auth) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
  }
  return auth
}

export function getFirebaseDb() {
  if (!database) {
    const active = getFirebaseAuth()
    database = getDatabase(active.app)
  }
  return database
}

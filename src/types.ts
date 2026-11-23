import type { Lang } from './i18n/locale.ts'

export type ThemeId = 'pink' | 'lavender' | 'peach' | 'blue'

export interface UserProfile {
  displayName: string
  email: string
  photoURL: string
  coupleId: string | null
  pinHash: string
  pinSalt: string
  theme: ThemeId
  darkMode: boolean
  locationSharing: boolean
  language?: Lang
}

export interface SessionUser {
  uid: string
  email: string
}

export interface MemberProfile {
  displayName: string
  photoURL: string
  joinedAt: number
}

export interface CustomStatus {
  id: string
  emoji: string
  label: string
  order: number
}

export interface StatusEntry {
  emoji: string
  label: string
  updatedAt: number
}

export interface LoveNote {
  id: string
  authorId: string
  text: string
  createdAt: number
}

export interface CoupleSettings {
  relationshipStartDate: string
  nextMeetingDate: string
  statusOptions: CustomStatus[]
}

export type VoteChoice = 'like' | 'skip'
export type DeckCategory = 'movies' | 'food' | 'virtual-dates' | 'games' | 'activities'
export type ActivityCategory = 'virtual-date' | 'movie' | 'game' | 'idea' | 'other'

export interface DeckItem {
  id: string
  category: DeckCategory
  title: string
  detail: string
  emoji: string
}

export interface MatchEntry {
  itemId: string
  title: string
  category: string
  emoji: string
  matchedAt: number
}

export interface WheelOption {
  id: string
  label: string
  createdBy: string
}

export interface WheelResult {
  label: string
  spunBy: string
  spunAt: number
}

export interface CoinFlip {
  result: string
  flippedBy: string
  flippedAt: number
}

export interface CoinState {
  sideA: string
  sideB: string
  lastFlip: CoinFlip | null
}

export interface Activity {
  id: string
  title: string
  description: string
  category: ActivityCategory
  completed: boolean
  favourite: boolean
  scheduledAt: string
  createdBy: string
  createdAt: number
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  doneBy: string
}

export interface Memory {
  id: string
  title: string
  description: string
  date: string
  imageUrl: string
  favourite: boolean
  label: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface SharedLocation {
  lat: number
  lng: number
  updatedAt: number
}

export interface Presence {
  online: boolean
  lastSeen: number
}

export interface CoupleData {
  ownerId: string
  partnerId: string | null
  createdAt: number
  inviteCode: string
  profiles: Record<string, MemberProfile>
  settings: CoupleSettings
  statuses: Record<string, StatusEntry>
  loveNotes: Record<string, LoveNote>
  votes: Record<string, Record<string, VoteChoice>>
  matches: Record<string, MatchEntry>
  wheelOptions: Record<string, WheelOption>
  wheelResult: WheelResult | null
  coin: CoinState
  activities: Record<string, Activity>
  checklist: Record<string, ChecklistItem>
  memories: Record<string, Memory>
  locations: Record<string, SharedLocation>
  presence: Record<string, Presence>
}

export interface Invitation {
  coupleId: string
  createdBy: string
  expiresAt: number
}

export interface ActivityInput {
  title: string
  description: string
  category: ActivityCategory
  scheduledAt: string
}

export interface MemoryInput {
  title: string
  description: string
  date: string
  imageUrl: string
  label: string
  favourite: boolean
}

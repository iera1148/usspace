import type { ActivityCategory, CustomStatus, DeckCategory, DeckItem } from '../types.ts'

export const DECK_CATEGORIES: { id: DeckCategory; label: string }[] = [
  { id: 'movies', label: 'Movies' },
  { id: 'food', label: 'Food' },
  { id: 'virtual-dates', label: 'Virtual dates' },
  { id: 'games', label: 'Games' },
  { id: 'activities', label: 'Activities' },
]

export const DECK: DeckItem[] = [
  { id: 'movie-before-sunrise', category: 'movies', emoji: '🌙', title: 'Before Sunrise', detail: 'A night that is mostly talking. Perfect from two beds.' },
  { id: 'movie-your-name', category: 'movies', emoji: '✨', title: 'Your Name', detail: 'Distance, timing, and a sky you both look at.' },
  { id: 'movie-about-time', category: 'movies', emoji: '⏳', title: 'About Time', detail: 'A soft rewatch for a quiet Sunday call.' },
  { id: 'movie-spirited', category: 'movies', emoji: '🐉', title: 'Spirited Away', detail: 'Animation night with snacks on both sides.' },
  { id: 'movie-lalaland', category: 'movies', emoji: '🎶', title: 'La La Land', detail: 'A little dramatic, a little dreamy, very us.' },
  { id: 'movie-paddington', category: 'movies', emoji: '🧸', title: 'Paddington 2', detail: 'Gentle, funny, and impossible to argue with.' },
  { id: 'food-noodles', category: 'food', emoji: '🍜', title: 'Same noodles', detail: 'Cook the same packet and eat on camera.' },
  { id: 'food-breakfast', category: 'food', emoji: '🥞', title: 'Breakfast for dinner', detail: 'Pancakes, eggs, or toast. Nobody has to dress up.' },
  { id: 'food-ice-cream', category: 'food', emoji: '🍨', title: 'Ice cream call', detail: 'Pick a flavour and compare the first bite.' },
  { id: 'food-sushi', category: 'food', emoji: '🍣', title: 'Sushi night', detail: 'Takeaway in both cities, same order if you can.' },
  { id: 'food-bake', category: 'food', emoji: '🍪', title: 'Bake the same thing', detail: 'One recipe, two kitchens, messy hands.' },
  { id: 'food-tea', category: 'food', emoji: '🍵', title: 'Tea and a story', detail: 'Warm drinks and one story from the week.' },
  { id: 'date-sunset', category: 'virtual-dates', emoji: '🌇', title: 'Sunset call', detail: 'Whoever sees the sun first describes the colour.' },
  { id: 'date-museum', category: 'virtual-dates', emoji: '🖼️', title: 'Online museum', detail: 'Wander the same gallery link and pick a favourite.' },
  { id: 'date-playlist', category: 'virtual-dates', emoji: '🎧', title: 'Playlist swap', detail: 'Three songs each, then listen together.' },
  { id: 'date-study', category: 'virtual-dates', emoji: '📚', title: 'Quiet study date', detail: 'Cameras on, work for 40 minutes, then talk.' },
  { id: 'date-recipe', category: 'virtual-dates', emoji: '👩‍🍳', title: 'Cook the same video', detail: 'Follow one recipe video from your own kitchens.' },
  { id: 'date-stars', category: 'virtual-dates', emoji: '🌟', title: 'Stargazing', detail: 'Go outside, or open the window, and talk slowly.' },
  { id: 'game-stardew', category: 'games', emoji: '🌾', title: 'Stardew Valley', detail: 'A cosy farm and no need to rush.' },
  { id: 'game-chess', category: 'games', emoji: '♟️', title: 'Online chess', detail: 'One game. Winner picks the next call time.' },
  { id: 'game-jackbox', category: 'games', emoji: '📦', title: 'A party game', detail: 'Jackbox, Gartic, or anything you can join from a link.' },
  { id: 'game-minecraft', category: 'games', emoji: '⛏️', title: 'Minecraft', detail: 'Build a tiny room that belongs to both of you.' },
  { id: 'game-draw', category: 'games', emoji: '✏️', title: 'Draw and guess', detail: 'Scribbl or a shared whiteboard. Keep it silly.' },
  { id: 'game-words', category: 'games', emoji: '🔤', title: 'Word game', detail: 'Twenty questions, categories, or a spelling race.' },
  { id: 'act-questions', category: 'activities', emoji: '💬', title: '20 questions about us', detail: 'Only questions you have never asked out loud.' },
  { id: 'act-room', category: 'activities', emoji: '🪴', title: 'Room show and tell', detail: 'Pan the camera and tell the story of one object.' },
  { id: 'act-letter', category: 'activities', emoji: '💌', title: 'Read a letter', detail: 'Write for five minutes, then read it on the call.' },
  { id: 'act-trip', category: 'activities', emoji: '✈️', title: 'Plan the next meeting', detail: 'Talk through the day you will actually be together.' },
  { id: 'act-stretch', category: 'activities', emoji: '🧘', title: 'Stretch together', detail: 'Ten minutes, cameras on the floor, no performance.' },
  { id: 'act-photo', category: 'activities', emoji: '📸', title: 'Today in one photo', detail: 'Each of you shares one picture from the day.' },
]

export const DEFAULT_STATUSES: CustomStatus[] = [
  { id: 'missing', emoji: '♡', label: 'Missing you', order: 1 },
  { id: 'working', emoji: '☕', label: 'Working', order: 2 },
  { id: 'hungry', emoji: '🍜', label: 'Hungry', order: 3 },
  { id: 'gaming', emoji: '🎮', label: 'Gaming', order: 4 },
  { id: 'call', emoji: '📞', label: 'Free to call', order: 5 },
  { id: 'sleeping', emoji: '😴', label: 'Sleeping', order: 6 },
  { id: 'thinking', emoji: '🥰', label: 'Thinking of you', order: 7 },
]

export const DEFAULT_WHEEL = [
  'Watch Netflix together',
  'Play an online game',
  'Have a video call',
  'Order food',
  'Watch a movie',
  'Have a virtual dinner date',
  'Surprise me!',
]

export const COIN_PRESETS = [
  ['I call first', 'You call first'],
  ['I choose the movie', 'You choose the movie'],
  ['I say I love you first', 'You say it first'],
  ['I pick dinner', 'You pick dinner'],
]

export const STARTER_ACTIVITIES: { title: string; description: string; category: ActivityCategory }[] = [
  { title: 'Video date with snacks', description: 'A starter idea you can delete. Cameras on, phones down.', category: 'virtual-date' },
  { title: 'Film neither of you has seen', description: 'A starter idea you can delete. Decide with This or That.', category: 'movie' },
  { title: 'One online game', description: 'A starter idea you can delete. Forty-five minutes, then talk.', category: 'game' },
]

export const STARTER_CHECKLIST = [
  'Charge both phones',
  'Pick the film or game',
  'Snacks within reach',
  'Say one thing you loved today',
]

export const IDEA_CATALOG: { title: string; description: string; category: ActivityCategory; emoji: string }[] = [
  { title: 'Museum link date', description: 'Open the same online gallery and choose one piece each.', category: 'virtual-date', emoji: '🖼️' },
  { title: 'Sunrise or sunset call', description: 'Whoever has the sky first describes it.', category: 'virtual-date', emoji: '🌇' },
  { title: 'Parallel cooking', description: 'Follow one recipe video from two kitchens.', category: 'virtual-date', emoji: '👩‍🍳' },
  { title: 'Comfort rewatch', description: 'A film you both already love, with commentary allowed.', category: 'movie', emoji: '🎬' },
  { title: 'Double feature', description: 'One short film, then one longer film if you are still awake.', category: 'movie', emoji: '🍿' },
  { title: 'Stardew on a call', description: 'Farm for a bit, then show each other your houses.', category: 'game', emoji: '🌾' },
  { title: 'Draw and guess', description: 'A shared whiteboard or Scribbl. Keep the drawings bad.', category: 'game', emoji: '✏️' },
  { title: 'Future weekend sketch', description: 'Plan the first real day together, hour by hour.', category: 'idea', emoji: '🗓️' },
  { title: 'Voice-note walk', description: 'Walk in your own city and send what you notice.', category: 'idea', emoji: '🚶' },
]

export const MEMORY_LABELS = [
  'Our First Call',
  'First Meeting',
  'First Date',
  'Just Because',
  'Anniversary',
  'A Random Tuesday',
]

export const THEMES: { id: 'pink' | 'lavender' | 'peach' | 'blue'; label: string; swatch: string }[] = [
  { id: 'pink', label: 'Baby pink', swatch: '#FF79A8' },
  { id: 'lavender', label: 'Lavender', swatch: '#8B7CFF' },
  { id: 'peach', label: 'Peach', swatch: '#F0946C' },
  { id: 'blue', label: 'Pastel blue', swatch: '#5AAED8' },
]

export const PRIVACY_POINTS = [
  'Only the two of you can see this space.',
  'Notes, plans, memories, and your status are shared with your partner.',
  'Your location is shared only when you choose to.',
]

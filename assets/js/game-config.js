/* Thali Catch - settings the café can change without touching the game code. */
window.NC_GAME_CONFIG = {
  // Shared leaderboard (Supabase). Leave both empty to run in "this device only" mode.
  // Fill in from Supabase → Project settings → API ("Project URL" and the "anon public" key).
  // The anon key is meant to be public; the database only allows the game's own functions.
  supabaseUrl: "",
  supabaseAnonKey: "",

  // The 7-day challenge runs on these days of every month (Dhaka time, UTC+6).
  challengeStartDay: 1, // 1 = the 1st of the month
  challengeDays: 7,

  winners: 3, // top players who get the discount
  discount: "10% off every Nutri Café meal for the month",
};

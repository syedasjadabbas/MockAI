// Centralized photography references for the Candidate Panel's visual
// language (redesign spec section 5: "keep external image URLs
// centralized and easy to replace later — do not hardcode dozens of image
// URLs across components"). Every page that wants a photographic section
// imports from here instead of embedding its own URL, so swapping the
// source (e.g. to self-hosted/licensed assets later) is a one-file change.
//
// Chosen deliberately, not decoratively: each image was picked to match a
// specific page's purpose (auth confidence, dashboard momentum, interview
// environment) and to sit naturally alongside the deep burgundy/wine
// accent used throughout - never a generic "business people" filler shot,
// never AI/robot/tech imagery.
export const CANDIDATE_IMAGES = {
  // Login / Register split panel - a composed, confident portrait whose
  // tie color echoes the panel's own accent, tying the photography to the
  // palette instead of looking like unrelated stock art.
  authHero: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80',
  // Dashboard - a small editorial visual section conveying momentum/
  // confidence rather than a literal "AI" or "interview" cliche.
  dashboardHero: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1200&q=80',
  // Interview Preparation - two people in an actual interview-style
  // conversation, setting expectations for what's about to happen.
  preparationHero: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
};

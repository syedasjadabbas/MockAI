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
// Login/Register/Forgot Password deliberately do NOT use a photo from
// here - see AuthVisualPanel.jsx (candidate/components) for why: an
// abstract, on-brand composition (typography + a waveform motif tied to
// MockAI's actual product - recorded spoken interview answers) instead of
// stock photography, after repeated feedback that photo choices for
// authentication screens kept reading as generic stock art.
export const CANDIDATE_IMAGES = {
  // Dashboard - a small editorial visual section conveying momentum/
  // confidence rather than a literal "AI" or "interview" cliche.
  dashboardHero: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1200&q=80',
  // Interview Preparation - two people in an actual interview-style
  // conversation, setting expectations for what's about to happen.
  preparationHero: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
};

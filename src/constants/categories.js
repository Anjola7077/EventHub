// Single source of truth for event categories.
// Used by Create Event (the values actually written to the backend `category`
// field), the Events filter bar, and the Home category chips. Keep this list as
// the canonical set so filters always match what can be created.
//
// NOTE: the backend stores `category` as a free-form string, so adding entries
// here is safe and needs no backend change. If the backend ever switches to an
// enum, these exact strings must be mirrored there.
export const EVENT_CATEGORIES = [
  'Technology',
  'Business',
  'Music',
  'Arts & Culture',
  'Food & Drink',
  'Health & Wellness',
  'Sports & Fitness',
  'Education',
  'Networking',
  'Community',
  'Faith & Spirituality',
  'Fashion & Beauty',
  'Film & Media',
  'Nightlife',
  'Comedy',
  'Gaming',
  'Design',
  'Workshops',
];

// Events page prepends an "All" filter.
export const EVENT_FILTER_CATEGORIES = ['All', ...EVENT_CATEGORIES];

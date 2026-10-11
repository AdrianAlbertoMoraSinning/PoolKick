export const APP = {
  name: 'PoolKick',
  tagline: 'Predict. Compete. Brag.',
  supportEmail: 'support@poolkick.app',
  version: '3.1.0',
  brandStatus: 'temporary',
  donationUrl: '',
  adsEnabled: false,
  supportedLocales: ['en','es','fr'],
}

export const SCORING_PRESETS = {
  classic: {
    label: 'PoolKick 4–3–2–1',
    exactWin: 4,
    winner: 3,
    exactDraw: 2,
    draw: 1,
  },
  // Kept only for backward compatibility with any legacy pool row.
  simple: { label: 'Legacy Simple 3–1', exact: 3, difference: 1, outcome: 1 },
}

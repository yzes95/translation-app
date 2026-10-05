// Payment and API configuration for LinguaFlow
// Public keys are safe to be included in the client bundle.

export const PAYMENT_CONFIG = {
  currency: 'GBP',
  currencySymbol: '£',

  // Live Stripe Publishable Key
  stripePublishableKey: 'pk_live_51UMyXSBs34anTSdDxT1j59hOkfrepLQ5FALwh2DiVpdUZaJVWdB7MmqmfFeRSgnzD8mdt0Vys3610JQ1N6CJqMd400swiXiSRL',

  // PayPal Client ID (PayPal Business account)
  paypalClientId: 'BAAW7zHMP02c7_pLXzXMc9I5Zo863dDTKCbDt255JTIReXPYLScDbbpwuwAdw1-QgRKDm_xvDY2Vhxu9cU',

  // Preset tip amounts
  tiers: [
    { id: 'tip_1', amount: 1, label: 'Coffee', emoji: '☕', description: 'Buy a warm cup of coffee' },
    { id: 'tip_3', amount: 3, label: 'Snack', emoji: '🥪', description: 'Fuel active development' },
    { id: 'tip_5', amount: 5, label: 'Supporter', emoji: '🚀', description: 'Help keep LinguaFlow lively' }
  ]
};

// Render Backend API URL configuration
// During development, defaults to local or can point directly to the deployed Render Web Service
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://linguaflow-api.onrender.com');

// Configuration file for "Support the App" (Donations / Tips)
// Simply replace the placeholder values below with your real bank details or online payment links.

export const DONATION_CONFIG = {
  // Primary Currency Display
  currencySymbol: '£',
  currencyCode: 'GBP',

  // Preset quick tip amounts
  tiers: [
    { id: 'coffee', amount: 1, label: 'Coffee', emoji: '☕', description: 'Buy the developer a warm cup of coffee' },
    { id: 'meal', amount: 3, label: 'Snack / Lunch', emoji: '🥪', description: 'Fuel a productive coding session' },
    { id: 'rocket', amount: 5, label: 'Super Supporter', emoji: '🚀', description: 'Help cover ongoing development and updates' }
  ],

  // 1. Direct Bank Transfer Details (Instant UK / International Transfer)
  // Fill in your bank account details below:
  bankDetails: {
    enabled: true,
    accountHolder: 'Yahya (LinguaFlow Developer)', // Replace with your legal/account name
    bankName: 'Wise', // Replace with your bank name
    sortCode: '23-08-01',                          // Replace with your 6-digit sort code
    accountNumber: '53277190',                     // Replace with your 8-digit account number
    iban: 'GB18TRWI23080153277190',                // Replace with your international IBAN (for foreign donors)
    swiftBic: 'TRWIGB2LXXX',                          // Replace with your bank BIC/SWIFT code
    reference: 'LinguaFlow'                        // Suggested transfer reference for the user
  },

  // 2. Online Payment Links (Stripe / PayPal / Buy Me A Coffee)
  // If you have Stripe Payment Links (free to create on dashboard.stripe.com/payment-links),
  // paste the URLs below. If left empty (''), the app will automatically highlight Direct Bank Transfer.
  paymentLinks: {
    stripe1Gbp: '',      // e.g. 'https://buy.stripe.com/your-1-gbp-link'
    stripe3Gbp: '',      // e.g. 'https://buy.stripe.com/your-3-gbp-link'
    stripe5Gbp: '',      // e.g. 'https://buy.stripe.com/your-5-gbp-link'
    stripeCustom: '',    // e.g. 'https://donate.stripe.com/your-custom-link'
    paypalMe: '',        // e.g. 'https://paypal.me/yourusername'
    buyMeACoffee: ''     // e.g. 'https://buymeacoffee.com/yourusername'
  }
};

import { PLAN_OPTIONS } from './enum-options';


export const PLAN_ORDER = PLAN_OPTIONS.map((option) => option.value);

// Placeholder for styling data - replace with your actual data structure/source
export const PRICING_STYLES = [
    { /* Style for Emerald */ },
    { /* Style for Bronze */ },
    { /* Style for Silver */ },
    { /* Style for Gold */ },
    { /* Style for Platinum */ },
    { /* Style for Coral */ },
    // Add more styles if needed, ensure order matches PLAN_ORDER after filtering
];

// Placeholder for currency data - replace with your actual data structure/source
export const CURRENCY_CODES_DATA = [
    { currency: { code: 'AUD', symbol: '$' } },
    { currency: { code: 'USD', symbol: '$' } },
    { currency: { code: 'GBP', symbol: '£' } },
    // Add other currencies
];

// Define constants for bot names and API states
export const BOT_NAMES = ["Seek", "Jora", "Reed", "Jobserve"] as const;

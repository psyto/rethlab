/**
 * Kodiak feature flag.
 * Set NEXT_PUBLIC_KODIAK_ENABLED=true in .env when Kodiak vault is deployed.
 */
export const KODIAK_ENABLED = process.env.NEXT_PUBLIC_KODIAK_ENABLED === 'true';

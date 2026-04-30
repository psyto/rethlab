import { apiSuccess, apiError, withErrorHandler } from '@/lib/api/utils';

// TODO: Replace with actual Kodiak vault address once deployed
const KODIAK_VAULT_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Verify if a wallet address is a Kodiak vault depositor.
 * Checks the Hyperliquid API for vault depositor list.
 */
export const POST = withErrorHandler(async (req) => {
  const { walletAddress } = await req.json();

  if (!walletAddress || typeof walletAddress !== 'string') {
    return apiError('Wallet address is required', 400);
  }

  // Normalize address to lowercase for comparison
  const normalized = walletAddress.toLowerCase().trim();

  // Validate address format (0x + 40 hex chars)
  if (!/^0x[a-f0-9]{40}$/i.test(normalized)) {
    return apiError('Invalid wallet address format', 400);
  }

  try {
    const isDepositor = await checkKodiakDepositor(normalized);

    return apiSuccess({
      walletAddress: normalized,
      isDepositor,
    });
  } catch (err) {
    console.error('Failed to verify Kodiak depositor:', err);
    return apiError('Failed to verify wallet. Please try again.', 500);
  }
});

async function checkKodiakDepositor(walletAddress: string): Promise<boolean> {
  // TODO: Once vault is deployed, uncomment this and remove the placeholder
  //
  // const response = await fetch('https://api.hyperliquid.xyz/info', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     type: 'vaultDetails',
  //     vaultAddress: KODIAK_VAULT_ADDRESS,
  //   }),
  // });
  //
  // if (!response.ok) {
  //   throw new Error(`Hyperliquid API error: ${response.status}`);
  // }
  //
  // const data = await response.json();
  // const depositors: string[] = (data?.depositors || []).map(
  //   (d: { user: string }) => d.user.toLowerCase()
  // );
  //
  // return depositors.includes(walletAddress.toLowerCase());

  // Placeholder: vault not yet deployed — always return false
  // Remove this line and uncomment above once Kodiak vault is live
  void walletAddress;
  void KODIAK_VAULT_ADDRESS;
  return false;
}

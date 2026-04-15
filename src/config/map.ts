/**
 * Centralized map configuration.
 *
 * EXPO_PUBLIC_MAPTILER_KEY is read at build time by Expo's Metro bundler.
 * The EXPO_PUBLIC_ prefix is required — variables without it are stripped
 * from the client bundle for security reasons.
 *
 * Set the value in .env (already present in this project):
 *   EXPO_PUBLIC_MAPTILER_KEY=your_key_here
 *
 * Get a free key at: https://cloud.maptiler.com/account/keys
 */
export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

if (__DEV__ && !MAPTILER_KEY) {
  console.warn(
    '[map.ts] EXPO_PUBLIC_MAPTILER_KEY is missing. ' +
    'Map tiles will fail to load (403). ' +
    'Add the key to your .env file.',
  );
}

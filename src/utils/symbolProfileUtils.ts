import type { SymbolProfile } from '@/domain/market';

export type SymbolProfileParseResult =
  | { profile: SymbolProfile; error: null }
  | { profile: null; error: string };

/**
 * Parses and validates a SymbolProfile JSON string.
 *
 * Validation rules (in order):
 * 1. Must be valid JSON.
 * 2. Must be a plain object (not array, null, or primitive).
 * 3. Must contain a non-empty string `symbol` field.
 *
 * Returns either the parsed profile or a descriptive error string.
 * No partial import occurs on failure.
 *
 * This is a pure utility function — no framework imports, no side effects.
 */
export function parseAndValidateSymbolProfile(text: string): SymbolProfileParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { profile: null, error: 'SymbolProfile.json contains invalid JSON.' };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      profile: null,
      error: 'SymbolProfile.json has an unexpected structure. Expected a JSON object.',
    };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['symbol'] !== 'string' || obj['symbol'].trim() === '') {
    return {
      profile: null,
      error: 'SymbolProfile.json is missing the required "symbol" field.',
    };
  }

  return { profile: obj as SymbolProfile, error: null };
}

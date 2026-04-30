/**
 * Unified profile completeness check.
 *
 * Used by:
 *   - Home page (profile prompt)
 *   - My-events / guest center (profile card status)
 *   - Any future profile-related entry points
 *
 * Current MVP rule: bio + industry + city must all be non-empty.
 */

export interface ProfileCompletenessInput {
  bio: string | null;
  industry: string | null;
  city: string | null;
}

export function isProfileComplete(profile: ProfileCompletenessInput | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.bio?.trim() &&
    profile.industry?.trim() &&
    profile.city?.trim(),
  );
}

/**
 * Returns a list of missing fields for display purposes.
 */
export function getMissingProfileFields(profile: ProfileCompletenessInput | null): string[] {
  if (!profile) return ['bio', 'industry', 'city'];
  const missing: string[] = [];
  if (!profile.bio?.trim()) missing.push('bio');
  if (!profile.industry?.trim()) missing.push('industry');
  if (!profile.city?.trim()) missing.push('city');
  return missing;
}

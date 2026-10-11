/**
 * Toggles a feature tag key in the active list of selected keys.
 */
export function toggleFeatureTagKey(currentKeys: string[], targetKey: string): string[] {
  const set = new Set(currentKeys);
  if (set.has(targetKey)) {
    set.delete(targetKey);
  } else {
    set.add(targetKey);
  }
  return Array.from(set);
}

/**
 * Sanitizes and updates contributor field notes.
 */
export function updateFieldNotes(currentNotes: string, newNotes: string): string {
  return newNotes.trim();
}

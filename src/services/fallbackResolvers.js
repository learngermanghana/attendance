export async function resolveWithSheetFallback({ loadFromSheet, loadFromFallbackFields, fallbackFields }) {
  try {
    const fromSheet = await loadFromSheet();
    if (fromSheet.length > 0) return fromSheet;
  } catch {
    // Fall back when published sheet is unavailable.
  }

  for (const field of fallbackFields) {
    const records = await loadFromFallbackFields(field);
    if (records.length > 0) return records;
  }

  return [];
}

export async function resolveWithSheetThenFirestore({ loadFromSheet, loadFromFirestore }) {
  try {
    const fromSheet = await loadFromSheet();
    if (fromSheet.length > 0) return fromSheet;
  } catch {
    // Fall back when published sheet is unavailable.
  }

  return loadFromFirestore();
}

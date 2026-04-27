/**
 * Expand multi-word search terms into constituent words.
 * Polymarket's search is fairly literal — "bitcoin fork" only finds markets
 * with that exact phrase, missing broader "bitcoin" markets. By also searching
 * for significant individual words, we get both specific and broad results.
 * Stopwords and short words are excluded to avoid noise.
 */
export const SEARCH_EXPAND_STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "will", "would",
  "could", "should", "may", "might", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "and", "or", "but", "not",
  "this", "that", "it", "its", "if", "about", "above", "below", "between",
  "into", "through", "before", "after", "during", "what", "which", "who",
  "how", "when", "where", "why", "all", "each", "some", "any", "no",
  "more", "most", "other", "new", "next", "last", "first", "than",
  "price", "market", "prediction", "bet", "will", "does", "did", "has",
  "have", "had", "been", "being", "do", "going", "get", "make", "over",
  "under", "hit", "reach", "above", "below",
]);

export function expandSearchTerms(terms: string[]): string[] {
  const expanded = new Set<string>();
  const seen = new Set<string>();

  for (const term of terms) {
    const lower = term.toLowerCase().trim();
    if (seen.has(lower)) continue;
    seen.add(lower);
    expanded.add(term);

    // For multi-word terms, also add significant individual words
    const words = lower.split(/\s+/);
    if (words.length >= 2) {
      for (const word of words) {
        if (word.length < 3 || SEARCH_EXPAND_STOP.has(word)) continue;
        if (seen.has(word)) continue;
        seen.add(word);
        expanded.add(word);
      }
    }
  }

  return Array.from(expanded);
}

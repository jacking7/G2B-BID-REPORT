export function splitKeywordInput(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[,\n，、]+/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) {
        return false;
      }

      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function expandKeywordValues(values: string[]) {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const value of values) {
    for (const keyword of splitKeywordInput(value)) {
      const key = keyword.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        keywords.push(keyword);
      }
    }
  }

  return keywords;
}

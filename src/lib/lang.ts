export type DetectedLang = 'ko' | 'ja' | 'en';

export function detectLang(text: string): DetectedLang {
  // Korean Hangul syllables
  if (/[\uAC00-\uD7A3]/.test(text)) return 'ko';
  // Japanese Hiragana / Katakana
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  // CJK ideographs: treat as Japanese for our current dataset
  if (/[\u4E00-\u9FFF]/.test(text)) return 'ja';
  return 'en';
}

const HE_FILLERS = [
  "אהלן", "שלום", "ערב טוב", "בוקר טוב", "צהריים טובים", "לילה טוב",
  "מה שלומך", "מה נשמע", "מה קורה", "אוקיי", "אוקי", "אה", "אהמ",
  "תראי", "תראה", "כן", "לא", "תקשיב", "תקשיבי", "אז", "אז ככה",
  "קודם כל", "בעצם", "כאילו", "נו", "טוב",
];
const EN_FILLERS = [
  "hello", "hi", "hey", "good morning", "good evening", "good afternoon",
  "ok", "okay", "uh", "um", "ah", "well", "so", "like", "you know",
  "right", "alright", "listen",
];

/** Strip leading conversational fillers from a candidate title. */
function stripFillers(s) {
  let out = s.replace(/^[\s,.\-—–:!?…]+/, "").trim();
  const all = [...HE_FILLERS, ...EN_FILLERS].sort((a, b) => b.length - a.length);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of all) {
      // Match the filler at the start, optionally followed by comma/period/space
      const re = new RegExp(`^${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[\\s,.\\-—–:!?…]*`, "i");
      if (re.test(out)) {
        out = out.replace(re, "").trim();
        changed = true;
        break;
      }
    }
  }
  return out;
}

/**
 * Squeeze a candidate title into a short, meaningful headline (≤ 8 words,
 * ≤ 60 chars). Specifically designed for audio-transcript inputs where
 * the "title" arriving from a weak extractor is the whole opening
 * monologue — we strip fillers, take the first sentence, and cap word
 * count so the UI shows a real headline instead of "אהלן אביה ערב טוב…".
 */
function trimTitle(s) {
  const trimmed = s.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";

  // First, take just the first sentence (any of . ? ! ;)
  const firstSentence = trimmed.split(/[.!?;]\s+/)[0];

  // Drop conversational openers if present
  const cleaned = stripFillers(firstSentence) || firstSentence;

  // Cap on words
  const words = cleaned.split(/\s+/).filter(Boolean);
  let out = words.slice(0, maxWords).join(" ");

  // Cap on chars as a hard ceiling for very long single words
  if (out.length > maxChars) {
    out = out.slice(0, maxChars - 1).trim() + "…";
  } else if (words.length > maxWords) {
    out = out + "…";
  }
  return out;
}


const inputs = [
  "אהלן אביה, ערב טוב, מה שלומך? התבקשתי שוב פעם אה להחליט יוזר. אוקיי. אה, לכן קודם כל, תראי, אני אסתכל כאן בבית על על מחו",
  "מארק להכין דוח רבעוני עד סוף השבוע",
  "אז ככה, אז מה שהיה לי, רציתי לבקש שתבדקו את האינטגרציה של Salesforce עד יום חמישי",
  "hello okay um well let me see we need to schedule a meeting with the vendor next Tuesday",
  ""
];
for (const inp of inputs) {
  console.log(JSON.stringify({ in: inp.slice(0, 60), out: trimTitle(inp) }));
}

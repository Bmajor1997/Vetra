export const WORDS_PER_MINUTE = 180;
export const PLAYBACK_RATES = Array.from({ length: 41 }, (_, index) => Number((1 + index * 0.05).toFixed(2)));
export function normalizePlaybackRate(rate) { const clamped = Math.min(3, Math.max(1, Number(rate) || 1)); return Number((Math.round(clamped * 20) / 20).toFixed(2)); }
export function formatPlaybackRate(rate) { return `${normalizePlaybackRate(rate)}×`; }
export function splitSentences(text) { return text.match(/[^.!?]+[.!?]+[\]"')]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? []; }
export function wordsWithOffsets(text) { return [...text.matchAll(/\S+/g)].map((match) => ({ text: match[0], start: match.index })); }
export function buildDocument(sections, wordsPerMinute = WORDS_PER_MINUTE) {
  let sentenceCursor = 0, wordCursor = 0;
  const normalized = sections.map((section, sectionIndex) => {
    const sentences = splitSentences(section.text).map((text) => { const words = wordsWithOffsets(text); const sentence = { text, sectionIndex, index: sentenceCursor++, startWord: wordCursor, words }; wordCursor += words.length; return sentence; });
    return { ...section, sectionIndex, sentences, wordCount: sentences.reduce((sum, item) => sum + item.words.length, 0) };
  });
  const totalWords = normalized.reduce((sum, section) => sum + section.wordCount, 0); let elapsedWords = 0;
  normalized.forEach((section) => { section.startRatio = totalWords ? elapsedWords / totalWords : 0; elapsedWords += section.wordCount; });
  return { sections: normalized, sentences: normalized.flatMap((section) => section.sentences), totalWords, durationSeconds: Math.max(1, Math.round((totalWords / wordsPerMinute) * 60)) };
}
export function progressForSentence(document, sentenceIndex, wordIndex = 0) { const sentence = document.sentences[sentenceIndex]; if (!sentence || !document.totalWords) return 0; return Math.min(1, (sentence.startWord + Math.max(0, wordIndex)) / document.totalWords); }
export function formatTime(seconds) { const safe = Math.max(0, Math.round(seconds)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`; }

export function parseDocumentText(source, fallbackTitle = "Untitled document") {
  const text = source.replace(/\r\n?/g, "\n").trim();
  if (!text) return { title: fallbackTitle, sections: [] };
  const lines = text.split("\n");
  let title = fallbackTitle;
  const sections = [];
  let current = { heading: "Document", lines: [] };
  let foundHeading = false;
  const flush = () => {
    const body = current.lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (body) sections.push({ heading: current.heading, text: body });
  };
  lines.forEach((line, index) => {
    const markdown = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    const plainHeading = !markdown && line.trim() && line.trim().length <= 70 && index < lines.length - 1 && !/[.!?]$/.test(line.trim()) && (lines[index + 1]?.trim() === "" || lines[index - 1]?.trim() === "");
    if (markdown?.[1].length === 1 && title === fallbackTitle && sections.length === 0 && current.lines.length === 0) { title = markdown[2]; return; }
    if (markdown || plainHeading) {
      flush(); foundHeading = true; current = { heading: markdown ? markdown[2] : line.trim(), lines: [] }; return;
    }
    current.lines.push(line);
  });
  flush();
  if (!foundHeading && sections.length) sections[0].heading = "Document";
  return { title, sections };
}

export function normalizeResumeSnapshot(snapshot) {
  if (!snapshot || snapshot.version !== 1 || typeof snapshot.title !== "string" || !Array.isArray(snapshot.sections) || !snapshot.sections.length) return null;
  const sections = snapshot.sections.filter((section) => typeof section?.heading === "string" && typeof section?.text === "string" && section.text.trim());
  if (!sections.length) return null;
  return {
    version: 1,
    title: snapshot.title || "Untitled document",
    sections,
    sentenceIndex: Math.max(0, Math.floor(Number(snapshot.sentenceIndex) || 0)),
    wordIndex: Math.max(0, Math.floor(Number(snapshot.wordIndex) || 0)),
    rate: normalizePlaybackRate(snapshot.rate),
    completed: Boolean(snapshot.completed),
    savedAt: Number(snapshot.savedAt) || Date.now(),
  };
}

export function buildReview(document) {
  const takeaways = document.sections.map((section) => section.sentences[0]?.text).filter(Boolean);
  const summarySentences = takeaways.length <= 2 ? takeaways : [takeaways[0], takeaways[Math.floor(takeaways.length / 2)], takeaways.at(-1)];
  return { summary: summarySentences.join(" "), takeaways };
}

export const WORDS_PER_MINUTE = 180;
export const PLAYBACK_RATES = Array.from({ length: 41 }, (_, index) => Number((1 + index * 0.05).toFixed(2)));
export function normalize_playback_rate(rate) { const clamped = Math.min(3, Math.max(1, Number(rate) || 1)); return Number((Math.round(clamped * 20) / 20).toFixed(2)); }
export function format_playback_rate(rate) { return `${normalize_playback_rate(rate)}×`; }
export function split_sentences(text) { return text.match(/[^.!?]+[.!?]+[\]"')]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? []; }
export function words_with_offsets(text) { return [...text.matchAll(/\S+/g)].map((match) => ({ text: match[0], start: match.index })); }
export function build_document(sections, wordsPerMinute = WORDS_PER_MINUTE) {
  let sentenceCursor = 0, wordCursor = 0;
  const normalized = sections.map((section, sectionIndex) => {
    const sentences = split_sentences(section.text).map((text) => { const words = words_with_offsets(text); const sentence = { text, sectionIndex, index: sentenceCursor++, startWord: wordCursor, words }; wordCursor += words.length; return sentence; });
    return { ...section, sectionIndex, sentences, wordCount: sentences.reduce((sum, item) => sum + item.words.length, 0) };
  });
  const totalWords = normalized.reduce((sum, section) => sum + section.wordCount, 0); let elapsedWords = 0;
  normalized.forEach((section) => { section.startRatio = totalWords ? elapsedWords / totalWords : 0; elapsedWords += section.wordCount; section.endRatio = totalWords ? elapsedWords / totalWords : 1; });
  return { sections: normalized, sentences: normalized.flatMap((section) => section.sentences), totalWords, durationSeconds: Math.max(1, Math.round((totalWords / wordsPerMinute) * 60)) };
}
export function progress_for_sentence(document, sentenceIndex, wordIndex = 0) { const sentence = document.sentences[sentenceIndex]; if (!sentence || !document.totalWords) return 0; return Math.min(1, (sentence.startWord + Math.max(0, wordIndex)) / document.totalWords); }
export function format_time(seconds) { const safe = Math.max(0, Math.round(seconds)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`; }

export function parse_document_text(source, fallbackTitle = "Untitled document") {
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

export function normalize_resume_snapshot(snapshot) {
  if (!snapshot || snapshot.version !== 1 || typeof snapshot.title !== "string" || !Array.isArray(snapshot.sections) || !snapshot.sections.length) return null;
  const sections = snapshot.sections.filter((section) => typeof section?.heading === "string" && typeof section?.text === "string" && section.text.trim());
  if (!sections.length) return null;
  return {
    version: 1,
    title: snapshot.title || "Untitled document",
    sections,
    sentenceIndex: Math.max(0, Math.floor(Number(snapshot.sentenceIndex) || 0)),
    wordIndex: Math.max(0, Math.floor(Number(snapshot.wordIndex) || 0)),
    rate: normalize_playback_rate(snapshot.rate),
    completed: Boolean(snapshot.completed),
    savedAt: Number(snapshot.savedAt) || Date.now(),
  };
}

export function build_review(document) {
  const takeaways = document.sections.map((section) => section.sentences[0]?.text).filter(Boolean);
  const summarySentences = takeaways.length <= 2 ? takeaways : [takeaways[0], takeaways[Math.floor(takeaways.length / 2)], takeaways.at(-1)];
  return { summary: summarySentences.join(" "), takeaways };
}

export function keyboard_command(key, hasInteractiveFocus = false) {
  if (hasInteractiveFocus) return null;
  if (key === " " || key === "Spacebar") return "toggle-playback";
  if (key === "ArrowLeft") return "previous-sentence";
  if (key === "ArrowRight") return "next-sentence";
  if (key.toLowerCase() === "s") return "open-sections";
  if (key === "?") return "show-shortcuts";
  return null;
}

export function section_timing(document, sectionIndex, globalProgress = 0, rate = 1) {
  const section = document.sections[sectionIndex];
  if (!section) return { durationSeconds: 0, remainingSeconds: 0, progress: 0 };
  const safeRate = normalize_playback_rate(rate);
  const durationSeconds = (document.durationSeconds * (section.endRatio - section.startRatio)) / safeRate;
  const progress = Math.min(1, Math.max(0, (globalProgress - section.startRatio) / Math.max(Number.EPSILON, section.endRatio - section.startRatio)));
  return { durationSeconds, remainingSeconds: durationSeconds * (1 - progress), progress };
}

export const WORDS_PER_MINUTE = 180;
export const PLAYBACK_RATES = Array.from({ length: 41 }, (_, index) => Number((1 + index * 0.05).toFixed(2)));
export function normalize_playback_rate(rate) { const clamped = Math.min(3, Math.max(1, Number(rate) || 1)); return Number((Math.round(clamped * 20) / 20).toFixed(2)); }
export function format_playback_rate(rate) { return `${normalize_playback_rate(rate)}×`; }
export function split_sentences(text) { return text.match(/[^.!?]+[.!?]+[\]"')]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? []; }
export function words_with_offsets(text) { return [...text.matchAll(/\S+/g)].map((match) => ({ text: match[0], start: match.index })); }
export function build_document(sections, words_per_minute = WORDS_PER_MINUTE) {
  let sentence_cursor = 0, word_cursor = 0;
  const normalized = sections.map((section, section_index) => {
    const sentences = split_sentences(section.text).map((text) => { const words = words_with_offsets(text); const sentence = { text, sectionIndex: section_index, index: sentence_cursor++, startWord: word_cursor, words }; word_cursor += words.length; return sentence; });
    return { ...section, sectionIndex: section_index, sentences, wordCount: sentences.reduce((sum, item) => sum + item.words.length, 0) };
  });
  const total_words = normalized.reduce((sum, section) => sum + section.wordCount, 0); let elapsed_words = 0;
  normalized.forEach((section) => { section.startRatio = total_words ? elapsed_words / total_words : 0; elapsed_words += section.wordCount; });
  return { sections: normalized, sentences: normalized.flatMap((section) => section.sentences), totalWords: total_words, durationSeconds: Math.max(1, Math.round((total_words / words_per_minute) * 60)) };
}
export function progress_for_sentence(document, sentence_index, word_index = 0) { const sentence = document.sentences[sentence_index]; if (!sentence || !document.totalWords) return 0; return Math.min(1, (sentence.startWord + Math.max(0, word_index)) / document.totalWords); }
export function format_time(seconds) { const safe = Math.max(0, Math.round(seconds)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`; }

export function parse_document_text(source, fallback_title = "Untitled document") {
  const text = source.replace(/\r\n?/g, "\n").trim();
  if (!text) return { title: fallback_title, sections: [] };
  const lines = text.split("\n");
  let title = fallback_title;
  const sections = [];
  let current = { heading: "Document", lines: [] };
  let found_heading = false;
  const flush = () => {
    const body = current.lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (body) sections.push({ heading: current.heading, text: body });
  };
  lines.forEach((line, index) => {
    const markdown = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    const plain_heading = !markdown && line.trim() && line.trim().length <= 70 && index < lines.length - 1 && !/[.!?]$/.test(line.trim()) && (lines[index + 1]?.trim() === "" || lines[index - 1]?.trim() === "");
    if (markdown?.[1].length === 1 && title === fallback_title && sections.length === 0 && current.lines.length === 0) { title = markdown[2]; return; }
    if (markdown || plain_heading) {
      flush(); found_heading = true; current = { heading: markdown ? markdown[2] : line.trim(), lines: [] }; return;
    }
    current.lines.push(line);
  });
  flush();
  if (!found_heading && sections.length) sections[0].heading = "Document";
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
  const summary_sentences = takeaways.length <= 2 ? takeaways : [takeaways[0], takeaways[Math.floor(takeaways.length / 2)], takeaways.at(-1)];
  return { summary: summary_sentences.join(" "), takeaways };
}

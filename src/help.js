const HELP_TOPICS = [
  { terms: ["upload", "add document", "open document"], answer: "Choose Add document, select Reading document or Worksheet document, then choose a PDF, Word, TXT, or Markdown file and select Open in reader." },
  { terms: ["worksheet", "checkbox", "blank", "answer"], answer: "Choose Worksheet document during upload. Vetra turns recognized checkboxes and answer blanks into controls you can complete while listening." },
  { terms: ["download", "export", "word document"], answer: "In Worksheet mode, use Download text or Download Word document beneath the document title. At the end of listening, the summary and key takeaways can also be downloaded separately or together." },
  { terms: ["wrong document", "close document", "remove document", "replace document"], answer: "Choose Close document at the top and confirm to return to the upload screen, where you can select the correct file." },
  { terms: ["speed", "faster", "slower", "rate"], answer: "Use the speed button on the left side of the listening player. Rates run from 1× through 3× in 0.05× steps, and changing speed leaves playback paused." },
  { terms: ["section", "contents", "heading"], answer: "Choose Sections in the upper-left corner to open the document outline. Selecting a section moves the text and progress position there while keeping playback paused." },
  { terms: ["accessibility", "text size", "spacing", "motion", "enlarge"], answer: "Choose the Aa button beneath playback speed to change document text size, reading spacing, motion, and current-word enlargement." },
  { terms: ["color", "highlight", "contrast", "personalize"], answer: "Choose the color-circle button near the top-right corner. Your selection changes highlights and Vetra’s accent color; High contrast is also available." },
  { terms: ["pdf", "scan", "selectable text"], answer: "Vetra reads PDFs that contain selectable text. Scanned-image PDFs still require OCR, which is planned but not included in this prototype." },
  { terms: ["summary", "takeaway", "review"], answer: "After a document finishes, open Review what I heard. Summary and Key takeaways are optional and can be downloaded separately or together." },
  { terms: ["keyboard", "shortcut", "help"], answer: "Choose the ? button for keyboard shortcuts. Space controls playback, the arrow keys move between passages, and S opens Sections when a document is active." },
];

export function local_help_answer(question) {
  const normalized = String(question || "").trim().toLowerCase();
  if (!normalized) return "Ask me how to upload, listen to, navigate, personalize, complete, or download a document in Vetra.";
  const topic = HELP_TOPICS.find(({ terms }) => terms.some((term) => normalized.includes(term)));
  return topic?.answer || "I can help with uploading documents, playback, sections, worksheets, downloads, colors, accessibility, PDF problems, and listening reviews. Try asking about one of those parts of Vetra.";
}

export const VETRA_HELP_CONTEXT = `You are Vetra Help, a concise support assistant for the Vetra document-reading prototype. Answer only questions about using Vetra. Vetra uploads PDF, DOCX, TXT, and Markdown files; offers Reading and Worksheet modes; reads using browser speech; highlights passages and words; has section navigation, playback speeds from 1x to 3x, a clickable progress bar, accessibility and color settings, worksheet TXT/DOCX exports, and optional summary/key-takeaway downloads. Scanned-PDF OCR, user accounts, browser extensions, cloned voices, and document question-answering are not implemented. Never claim a feature exists when it does not. Do not request or expose document contents, passwords, API keys, or other sensitive information. If asked about an unrelated topic, explain that you can only help with Vetra.`;

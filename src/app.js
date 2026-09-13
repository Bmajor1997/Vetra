import { sections } from "./content.js";
import { buildDocument, buildReview, formatPlaybackRate, formatTime, normalizeResumeSnapshot, parseDocumentText, PLAYBACK_RATES, progressForSentence } from "./model.js";
let doc = buildDocument(sections);
let documentTitle = "The quiet advantage of deliberate attention";
const RESUME_KEY = "voxify.resume.v1";
let persistenceReady = false;
const state = { sentenceIndex: 0, wordIndex: 0, rate: 1, playing: false, completed: false, utterance: null };
const $ = (selector) => document.querySelector(selector);
const el = { document: $("#document"), title: $("#documentTitle"), estimate: $("#documentEstimate"), resumeCard: $("#resumeCard"), resumeMessage: $("#resumeMessage"), resumePlayback: $("#resumePlayback"), startOver: $("#startOver"), completion: $("#completion"), openReview: $("#openReview"), reviewDialog: $("#reviewDialog"), closeReview: $("#closeReview"), reviewSummary: $("#reviewSummary"), reviewTakeaways: $("#reviewTakeaways"), downloadReview: $("#downloadReview"), sectionList: $("#sectionList"), panel: $("#sectionsPanel"), scrim: $("#panelScrim"), trigger: $("#sectionsTrigger"), close: $("#closeSections"), documentTrigger: $("#documentTrigger"), dialog: $("#documentDialog"), documentText: $("#documentText"), documentFile: $("#documentFile"), selectedFile: $("#selectedFile"), documentError: $("#documentError"), loadDocument: $("#loadDocument"), sectionName: $("#currentSectionName"), sectionPosition: $("#sectionPosition"), speedButton: $("#speedButton"), speedMenu: $("#speedMenu"), currentTime: $("#currentTime"), totalTime: $("#totalTime"), timeline: $("#timeline"), timelineComplete: $("#timelineComplete"), sectionDots: $("#sectionDots"), playPause: $("#playPause"), playIcon: $("#playIcon"), previous: $("#previousSentence"), next: $("#nextSentence") };

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function renderDocument() {
  el.document.innerHTML = doc.sections.map((section) => `<section id="section-${section.sectionIndex}" data-section="${section.sectionIndex}"><h2>${escapeHtml(section.heading)}</h2><p>${section.sentences.map((sentence) => `<span class="sentence" data-sentence="${sentence.index}">${sentence.words.map((word, i) => `<span class="word" data-word="${i}">${escapeHtml(word.text)}</span>`).join(" ")}</span>`).join(" ")}</p></section>`).join("");
}
function renderSections() {
  el.sectionList.innerHTML = doc.sections.map((section, index) => `<button data-section-jump="${index}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(section.heading)}</strong><small>${section.wordCount} words</small></button>`).join("");
  el.sectionDots.innerHTML = doc.sections.map((section) => `<span style="left:${section.startRatio * 100}%" aria-hidden="true"></span>`).join("") + '<span style="left:100%" aria-hidden="true"></span>';
}
const activeSentence = () => doc.sentences[state.sentenceIndex];
const activeSection = () => doc.sections[activeSentence()?.sectionIndex ?? 0];
function renderState({ scroll = false } = {}) {
  document.querySelectorAll(".sentence.is-current, .word.is-current").forEach((node) => node.classList.remove("is-current"));
  const sentenceNode = document.querySelector(`[data-sentence="${state.sentenceIndex}"]`);
  sentenceNode?.classList.add("is-current"); sentenceNode?.querySelector(`[data-word="${state.wordIndex}"]`)?.classList.add("is-current");
  if (scroll) sentenceNode?.scrollIntoView({ behavior: "smooth", block: "center" });
  const section = activeSection(), progress = state.completed ? 1 : progressForSentence(doc, state.sentenceIndex, state.wordIndex); el.title.textContent = documentTitle;
  el.sectionName.textContent = section.heading; el.sectionPosition.textContent = `Section ${section.sectionIndex + 1} of ${doc.sections.length}`;
  el.currentTime.textContent = formatTime((doc.durationSeconds * progress) / state.rate); el.totalTime.textContent = formatTime(doc.durationSeconds / state.rate); el.estimate.textContent = `${formatTime(doc.durationSeconds / state.rate)} estimated listening time · ${doc.sections.length} ${doc.sections.length === 1 ? "section" : "sections"}`;
  el.timelineComplete.style.width = `${progress * 100}%`; el.timeline.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  el.playIcon.textContent = state.playing ? "❚❚" : "▶"; el.playPause.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  el.completion.hidden = !state.completed;
  document.querySelectorAll("[data-section-jump]").forEach((button) => button.classList.toggle("is-current", Number(button.dataset.sectionJump) === section.sectionIndex));
  if (persistenceReady) persistState();
}
function persistState() { try { localStorage.setItem(RESUME_KEY, JSON.stringify({ version: 1, title: documentTitle, sections: doc.sections.map(({ heading, text }) => ({ heading, text })), sentenceIndex: state.sentenceIndex, wordIndex: state.wordIndex, rate: state.rate, completed: state.completed, savedAt: Date.now() })); } catch { /* Storage can be unavailable or full; playback still works. */ } }
function restoreState() { try { const saved = normalizeResumeSnapshot(JSON.parse(localStorage.getItem(RESUME_KEY))); if (!saved) return false; doc = buildDocument(saved.sections); documentTitle = saved.title; state.sentenceIndex = Math.min(saved.sentenceIndex, doc.sentences.length - 1); state.wordIndex = Math.min(saved.wordIndex, Math.max(0, doc.sentences[state.sentenceIndex].words.length - 1)); state.rate = saved.rate; state.completed = saved.completed; el.speedButton.textContent = formatPlaybackRate(state.rate); const progress = progressForSentence(doc, state.sentenceIndex, state.wordIndex); if (!state.completed && progress > 0 && progress < 1) { el.resumeMessage.textContent = `Continue “${documentTitle}” — ${formatTime(doc.durationSeconds * progress / state.rate)} of ${formatTime(doc.durationSeconds / state.rate)}`; el.resumeCard.hidden = false; } return true; } catch { return false; } }
function cancelSpeech() { speechSynthesis.cancel(); state.utterance = null; state.playing = false; renderState(); }
function speakCurrentSentence() {
  el.resumeCard.hidden = true; state.completed = false;
  speechSynthesis.cancel(); const sentence = activeSentence(); if (!sentence) return;
  const utterance = new SpeechSynthesisUtterance(sentence.text); utterance.rate = state.rate; state.utterance = utterance; state.playing = true;
  utterance.onboundary = (event) => { if (event.name !== "word") return; const next = sentence.words.findIndex((word, index) => event.charIndex >= word.start && event.charIndex < (sentence.words[index + 1]?.start ?? sentence.text.length + 1)); if (next >= 0) { state.wordIndex = next; renderState({ scroll: true }); } };
  utterance.onend = () => { if (!state.playing) return; if (state.sentenceIndex < doc.sentences.length - 1) { state.sentenceIndex++; state.wordIndex = 0; speakCurrentSentence(); } else { state.wordIndex = sentence.words.length - 1; state.playing = false; state.completed = true; renderState(); } };
  utterance.onerror = () => { state.playing = false; renderState(); };
  speechSynthesis.speak(utterance); renderState({ scroll: true });
}
function pauseForChoice() { if (state.playing) cancelSpeech(); }
function togglePanel(open) { if (open) pauseForChoice(); el.panel.classList.toggle("is-open", open); el.scrim.classList.toggle("is-open", open); el.panel.setAttribute("aria-hidden", String(!open)); el.trigger.setAttribute("aria-expanded", String(open)); if (open) el.close.focus(); else el.trigger.focus(); }
function jumpToSentence(index) { cancelSpeech(); state.completed = false; state.sentenceIndex = Math.max(0, Math.min(doc.sentences.length - 1, index)); state.wordIndex = 0; renderState({ scroll: true }); }
function loadParsedDocument(parsed) { if (!parsed.sections.length) { el.documentError.textContent = "Add some text before opening the reader."; return; } cancelSpeech(); doc = buildDocument(parsed.sections); documentTitle = parsed.title; state.sentenceIndex = 0; state.wordIndex = 0; state.completed = false; el.resumeCard.hidden = true; renderDocument(); renderSections(); renderState(); el.dialog.close(); window.scrollTo({ top: 0, behavior: "smooth" }); }
function renderReview() { const review = buildReview(doc); el.reviewSummary.textContent = review.summary; el.reviewTakeaways.innerHTML = review.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join(""); return review; }

PLAYBACK_RATES.forEach((speed) => { const button = document.createElement("button"); button.role = "option"; button.textContent = formatPlaybackRate(speed); button.dataset.speed = speed; el.speedMenu.append(button); });
restoreState(); renderDocument(); renderSections(); persistenceReady = true;
el.trigger.addEventListener("click", () => togglePanel(true)); el.close.addEventListener("click", () => togglePanel(false)); el.scrim.addEventListener("click", () => togglePanel(false));
el.documentTrigger.addEventListener("click", () => { pauseForChoice(); el.documentError.textContent = ""; el.dialog.showModal(); el.documentText.focus(); });
el.documentFile.addEventListener("change", async () => {
  const file = el.documentFile.files[0]; if (!file) return;
  el.selectedFile.textContent = file.name; el.documentError.textContent = ""; el.loadDocument.disabled = true; el.loadDocument.textContent = "Reading document…";
  try {
    if (/\.(pdf|docx)$/i.test(file.name)) {
      if (file.size > 25_000_000) throw new Error("Document is too large. The current limit is 25 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer()); let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
      const response = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, data: btoa(binary) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "The document could not be read."); el.documentText.value = result.text;
    } else { el.documentText.value = await file.text(); }
  } catch (error) { el.documentText.value = ""; el.documentError.textContent = error.message; }
  finally { el.loadDocument.disabled = false; el.loadDocument.textContent = "Open in reader"; }
});
el.loadDocument.addEventListener("click", () => loadParsedDocument(parseDocumentText(el.documentText.value, el.documentFile.files[0]?.name.replace(/\.(txt|md)$/i, "") || "Untitled document")));
el.sectionList.addEventListener("click", (event) => { const button = event.target.closest("[data-section-jump]"); if (!button) return; const section = doc.sections[Number(button.dataset.sectionJump)]; state.sentenceIndex = section.sentences[0].index; state.wordIndex = 0; cancelSpeech(); togglePanel(false); renderState({ scroll: true }); });
el.speedButton.addEventListener("click", () => { pauseForChoice(); const open = !el.speedMenu.classList.contains("is-open"); el.speedMenu.classList.toggle("is-open", open); el.speedButton.setAttribute("aria-expanded", String(open)); });
el.speedMenu.addEventListener("click", (event) => { const button = event.target.closest("[data-speed]"); if (!button) return; state.rate = Number(button.dataset.speed); state.playing = false; el.speedButton.textContent = formatPlaybackRate(state.rate); el.speedMenu.classList.remove("is-open"); el.speedButton.setAttribute("aria-expanded", "false"); renderState(); });
el.playPause.addEventListener("click", () => state.playing ? cancelSpeech() : speakCurrentSentence()); el.previous.addEventListener("click", () => jumpToSentence(state.sentenceIndex - 1)); el.next.addEventListener("click", () => jumpToSentence(state.sentenceIndex + 1));
el.resumePlayback.addEventListener("click", speakCurrentSentence); el.startOver.addEventListener("click", () => { el.resumeCard.hidden = true; jumpToSentence(0); });
el.openReview.addEventListener("click", () => { renderReview(); el.reviewDialog.showModal(); el.closeReview.focus(); }); el.closeReview.addEventListener("click", () => el.reviewDialog.close());
el.downloadReview.addEventListener("click", () => { const review = renderReview(); const body = `${documentTitle}\n\nSummary\n${review.summary}\n\nKey takeaways\n${review.takeaways.map((item) => `• ${item}`).join("\n")}\n`; const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `${documentTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "voxify"}-review.txt`; link.click(); URL.revokeObjectURL(url); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { if (el.panel.classList.contains("is-open")) togglePanel(false); el.speedMenu.classList.remove("is-open"); el.speedButton.setAttribute("aria-expanded", "false"); } });
renderState();

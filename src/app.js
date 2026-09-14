import { sections } from "./content.js";
import { build_document, build_review, format_playback_rate, format_time, keyboard_command, normalize_resume_snapshot, parse_document_text, PLAYBACK_RATES, progress_for_sentence, section_timing, speech_segment, worksheet_control_type } from "./model.js";
let doc = build_document(sections);
let documentTitle = "The quiet advantage of deliberate attention";
const RESUME_KEY = "voxify.resume.v1";
let persistenceReady = false;
let pending_document_text = "";
let active_document_mode = "reading";
let worksheet_responses = {};
const state = { sentenceIndex: 0, wordIndex: 0, rate: 1, playing: false, completed: false, utterance: null };
const $ = (selector) => document.querySelector(selector);
const el = { document: $("#document"), title: $("#documentTitle"), estimate: $("#documentEstimate"), playbackStatus: $("#playbackStatus"), shortcutTrigger: $("#shortcutTrigger"), shortcutDialog: $("#shortcutDialog"), closeShortcuts: $("#closeShortcuts"), resumeCard: $("#resumeCard"), resumeMessage: $("#resumeMessage"), resumePlayback: $("#resumePlayback"), startOver: $("#startOver"), completion: $("#completion"), openReview: $("#openReview"), reviewDialog: $("#reviewDialog"), closeReview: $("#closeReview"), reviewSummary: $("#reviewSummary"), reviewTakeaways: $("#reviewTakeaways"), downloadReview: $("#downloadReview"), sectionList: $("#sectionList"), panel: $("#sectionsPanel"), scrim: $("#panelScrim"), trigger: $("#sectionsTrigger"), close: $("#closeSections"), documentTrigger: $("#documentTrigger"), dialog: $("#documentDialog"), documentFile: $("#documentFile"), selectedFile: $("#selectedFile"), documentError: $("#documentError"), loadDocument: $("#loadDocument"), sectionName: $("#currentSectionName"), sectionPosition: $("#sectionPosition"), speedButton: $("#speedButton"), speedMenu: $("#speedMenu"), currentTime: $("#currentTime"), totalTime: $("#totalTime"), timeline: $("#timeline"), timelineComplete: $("#timelineComplete"), sectionDots: $("#sectionDots"), playPause: $("#playPause"), playIcon: $("#playIcon"), previous: $("#previousSentence"), next: $("#nextSentence") };

const escape_html = (value) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function render_document() {
  const render_word = (sentence, word, word_index) => {
    const control_id = `s${sentence.index}-w${word_index}`;
    const control_type = active_document_mode === "worksheet" ? worksheet_control_type(word.text) : null;
    if (control_type === "checkbox") {
      const checked = worksheet_responses[control_id] ?? /[☑☒]/.test(word.text);
      return `<button type="button" class="worksheet-checkbox" data-word="${word_index}" data-worksheet-control="${control_id}" aria-pressed="${checked}" aria-label="${checked ? "Uncheck" : "Check"} this worksheet item">${checked ? "☑" : "☐"}</button>`;
    }
    if (control_type === "answer") {
      const prompt = sentence.text.slice(0, word.start).replace(/[•☐□☑☒_]+/g, " ").trim().slice(-100) || "Worksheet answer";
      const value = typeof worksheet_responses[control_id] === "string" ? worksheet_responses[control_id] : "";
      return `<input class="worksheet-answer" data-word="${word_index}" data-worksheet-control="${control_id}" aria-label="Answer: ${escape_html(prompt)}" value="${escape_html(value)}" placeholder="Type your answer">`;
    }
    return `<span class="word" data-word="${word_index}">${escape_html(word.text)}</span>`;
  };
  el.document.innerHTML = doc.sections.map((section) => `<section id="section-${section.sectionIndex}" data-section="${section.sectionIndex}"><h2>${escape_html(section.heading)}</h2><p>${section.sentences.map((sentence) => `<span class="sentence" data-sentence="${sentence.index}">${sentence.words.map((word, i) => render_word(sentence, word, i)).join(" ")}</span>`).join(" ")}</p></section>`).join("");
  el.document.classList.toggle("has-worksheet-controls", Boolean(el.document.querySelector("[data-worksheet-control]")));
}
function render_sections() {
  el.sectionList.innerHTML = doc.sections.map((section, index) => `<button data-section-jump="${index}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escape_html(section.heading)}</strong><small data-section-duration="${index}"></small></button>`).join("");
  el.sectionDots.innerHTML = doc.sections.map((section, index) => `<span data-section-dot="${index}" style="left:${section.startRatio * 100}%" aria-hidden="true"></span>`).join("") + '<span style="left:100%" aria-hidden="true"></span>';
}
const active_sentence = () => doc.sentences[state.sentenceIndex];
const active_section = () => doc.sections[active_sentence()?.sectionIndex ?? 0];
function announce(message) { el.playbackStatus.textContent = ""; requestAnimationFrame(() => { el.playbackStatus.textContent = message; }); }
function render_state({ scroll = false } = {}) {
  document.querySelectorAll(".sentence.is-current, .word.is-current").forEach((node) => node.classList.remove("is-current"));
  const sentenceNode = document.querySelector(`[data-sentence="${state.sentenceIndex}"]`);
  sentenceNode?.classList.add("is-current"); sentenceNode?.querySelector(`[data-word="${state.wordIndex}"]`)?.classList.add("is-current");
  if (scroll) sentenceNode?.scrollIntoView({ behavior: "smooth", block: "center" });
  const section = active_section(), progress = state.completed ? 1 : progress_for_sentence(doc, state.sentenceIndex, state.wordIndex); el.title.textContent = documentTitle;
  const timing = section_timing(doc, section.sectionIndex, progress, state.rate);
  el.sectionName.textContent = section.heading; el.sectionPosition.textContent = `Section ${section.sectionIndex + 1} of ${doc.sections.length} · ${format_time(timing.remainingSeconds)} left`;
  el.currentTime.textContent = format_time((doc.durationSeconds * progress) / state.rate); el.totalTime.textContent = format_time(doc.durationSeconds / state.rate); el.estimate.textContent = `${format_time(doc.durationSeconds / state.rate)} estimated listening time · ${doc.sections.length} ${doc.sections.length === 1 ? "section" : "sections"}`;
  el.timelineComplete.style.width = `${progress * 100}%`; el.timeline.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  el.playIcon.textContent = state.playing ? "❚❚" : "▶"; el.playPause.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  el.previous.disabled = state.sentenceIndex === 0; el.next.disabled = state.sentenceIndex === doc.sentences.length - 1;
  el.completion.hidden = !state.completed;
  document.querySelectorAll("[data-section-jump]").forEach((button) => button.classList.toggle("is-current", Number(button.dataset.sectionJump) === section.sectionIndex));
  document.querySelectorAll("[data-section-duration]").forEach((label) => { label.textContent = `${format_time(section_timing(doc, Number(label.dataset.sectionDuration), 0, state.rate).durationSeconds)} at ${format_playback_rate(state.rate)}`; });
  document.querySelectorAll("[data-section-dot]").forEach((dot) => dot.classList.toggle("is-current", Number(dot.dataset.sectionDot) === section.sectionIndex));
  if (persistenceReady) persist_state();
}
function persist_state() { try { localStorage.setItem(RESUME_KEY, JSON.stringify({ version: 1, title: documentTitle, sections: doc.sections.map(({ heading, text }) => ({ heading, text })), sentenceIndex: state.sentenceIndex, wordIndex: state.wordIndex, rate: state.rate, completed: state.completed, documentMode: active_document_mode, worksheetResponses: worksheet_responses, savedAt: Date.now() })); } catch { /* Storage can be unavailable or full; playback still works. */ } }
function restore_state() { try { const saved = normalize_resume_snapshot(JSON.parse(localStorage.getItem(RESUME_KEY))); if (!saved) return false; doc = build_document(saved.sections); documentTitle = saved.title; active_document_mode = saved.documentMode; worksheet_responses = saved.worksheetResponses; state.sentenceIndex = Math.min(saved.sentenceIndex, doc.sentences.length - 1); state.wordIndex = Math.min(saved.wordIndex, Math.max(0, doc.sentences[state.sentenceIndex].words.length - 1)); state.rate = saved.rate; state.completed = saved.completed; el.speedButton.textContent = format_playback_rate(state.rate); const progress = progress_for_sentence(doc, state.sentenceIndex, state.wordIndex); if (!state.completed && progress > 0 && progress < 1) { el.resumeMessage.textContent = `Continue “${documentTitle}” — ${format_time(doc.durationSeconds * progress / state.rate)} of ${format_time(doc.durationSeconds / state.rate)}`; el.resumeCard.hidden = false; } return true; } catch { return false; } }
function cancel_speech() { speechSynthesis.cancel(); state.utterance = null; state.playing = false; render_state(); }
function speak_current_sentence() {
  el.resumeCard.hidden = true;
  if (state.completed) { state.sentenceIndex = 0; state.wordIndex = 0; }
  state.completed = false;
  speechSynthesis.cancel(); const sentence = active_sentence(); if (!sentence) return;
  const segment = speech_segment(sentence, state.wordIndex);
  const utterance = new SpeechSynthesisUtterance(segment.text); utterance.rate = state.rate; state.utterance = utterance; state.playing = true;
  utterance.onboundary = (event) => { if (event.name !== "word") return; const sourceIndex = segment.start + event.charIndex; const next = sentence.words.findIndex((word, index) => sourceIndex >= word.start && sourceIndex < (sentence.words[index + 1]?.start ?? sentence.text.length + 1)); if (next >= 0) { state.wordIndex = next; render_state({ scroll: true }); } };
  utterance.onend = () => { if (!state.playing) return; if (state.sentenceIndex < doc.sentences.length - 1) { state.sentenceIndex++; state.wordIndex = 0; speak_current_sentence(); } else { state.wordIndex = sentence.words.length - 1; state.playing = false; state.completed = true; render_state(); } };
  utterance.onerror = () => { state.playing = false; render_state(); };
  speechSynthesis.speak(utterance); render_state({ scroll: true });
}
function pause_for_choice() { if (state.playing) cancel_speech(); }
function toggle_panel(open) { if (open) pause_for_choice(); el.panel.classList.toggle("is-open", open); el.scrim.classList.toggle("is-open", open); el.panel.setAttribute("aria-hidden", String(!open)); el.trigger.setAttribute("aria-expanded", String(open)); if (open) { (el.sectionList.querySelector(".is-current") || el.close).focus(); announce("Sections opened. Playback paused."); } else el.trigger.focus(); }
function jump_to_sentence(index) { cancel_speech(); state.completed = false; state.sentenceIndex = Math.max(0, Math.min(doc.sentences.length - 1, index)); state.wordIndex = 0; render_state({ scroll: true }); }
function load_parsed_document(parsed, mode = "reading") { if (!parsed.sections.length) { el.documentError.textContent = "This document does not contain readable text."; return; } cancel_speech(); doc = build_document(parsed.sections); documentTitle = parsed.title; active_document_mode = mode === "worksheet" ? "worksheet" : "reading"; worksheet_responses = {}; state.sentenceIndex = 0; state.wordIndex = 0; state.completed = false; el.resumeCard.hidden = true; render_document(); render_sections(); render_state(); el.dialog.close(); window.scrollTo({ top: 0, behavior: "smooth" }); }
function render_review() { const review = build_review(doc); el.reviewSummary.textContent = review.summary; el.reviewTakeaways.innerHTML = review.takeaways.map((item) => `<li>${escape_html(item)}</li>`).join(""); return review; }

PLAYBACK_RATES.forEach((speed) => { const button = document.createElement("button"); button.role = "option"; button.tabIndex = -1; button.textContent = format_playback_rate(speed); button.dataset.speed = speed; el.speedMenu.append(button); });
restore_state(); render_document(); render_sections(); persistenceReady = true;
el.trigger.addEventListener("click", () => toggle_panel(true)); el.close.addEventListener("click", () => toggle_panel(false)); el.scrim.addEventListener("click", () => toggle_panel(false));
el.documentTrigger.addEventListener("click", () => { pause_for_choice(); pending_document_text = ""; el.documentFile.value = ""; el.dialog.querySelector('[name="documentMode"][value="reading"]').checked = true; el.selectedFile.textContent = "No document selected"; el.documentError.textContent = ""; el.loadDocument.disabled = true; el.dialog.showModal(); el.dialog.querySelector('[name="documentMode"]:checked').focus(); });
el.documentFile.addEventListener("change", async () => {
  const file = el.documentFile.files[0]; if (!file) return;
  pending_document_text = ""; el.selectedFile.textContent = `${file.name} · Reading…`; el.documentError.textContent = ""; el.loadDocument.disabled = true; el.loadDocument.textContent = "Reading document…";
  try {
    if (/\.(pdf|docx)$/i.test(file.name)) {
      if (file.size > 25_000_000) throw new Error("Document is too large. The current limit is 25 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer()); let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
      const response = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, data: btoa(binary) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "The document could not be read."); pending_document_text = result.text;
    } else { pending_document_text = await file.text(); }
    if (!pending_document_text.trim()) throw new Error("This document does not contain readable text.");
    el.selectedFile.textContent = `${file.name} · Ready`;
    el.loadDocument.disabled = false;
  } catch (error) { pending_document_text = ""; el.selectedFile.textContent = file.name; el.documentError.textContent = error.message; }
  finally { el.loadDocument.textContent = "Open in reader"; }
});
el.loadDocument.addEventListener("click", () => load_parsed_document(parse_document_text(pending_document_text, el.documentFile.files[0]?.name.replace(/\.(txt|md|pdf|docx)$/i, "") || "Untitled document"), el.dialog.querySelector('[name="documentMode"]:checked')?.value));
el.document.addEventListener("click", (event) => { const checkbox = event.target.closest(".worksheet-checkbox"); if (!checkbox) return; pause_for_choice(); const checked = checkbox.getAttribute("aria-pressed") !== "true"; worksheet_responses[checkbox.dataset.worksheetControl] = checked; checkbox.setAttribute("aria-pressed", String(checked)); checkbox.setAttribute("aria-label", `${checked ? "Uncheck" : "Check"} this worksheet item`); checkbox.textContent = checked ? "☑" : "☐"; persist_state(); });
el.document.addEventListener("input", (event) => { const answer = event.target.closest(".worksheet-answer"); if (!answer) return; pause_for_choice(); worksheet_responses[answer.dataset.worksheetControl] = answer.value; persist_state(); });
el.sectionList.addEventListener("click", (event) => { const button = event.target.closest("[data-section-jump]"); if (!button) return; const section = doc.sections[Number(button.dataset.sectionJump)]; state.sentenceIndex = section.sentences[0].index; state.wordIndex = 0; cancel_speech(); toggle_panel(false); render_state({ scroll: true }); announce(`${section.heading}. Section ${section.sectionIndex + 1} of ${doc.sections.length}. Playback paused.`); });
el.speedButton.addEventListener("click", () => { pause_for_choice(); const open = !el.speedMenu.classList.contains("is-open"); el.speedMenu.classList.toggle("is-open", open); el.speedButton.setAttribute("aria-expanded", String(open)); if (open) { const options = [...el.speedMenu.querySelectorAll("[data-speed]")]; options.forEach((option) => option.setAttribute("aria-selected", String(Number(option.dataset.speed) === state.rate))); (options.find((option) => Number(option.dataset.speed) === state.rate) || options[0]).focus(); announce("Speed menu opened. Playback paused."); } });
el.speedMenu.addEventListener("click", (event) => { const button = event.target.closest("[data-speed]"); if (!button) return; state.rate = Number(button.dataset.speed); state.playing = false; el.speedButton.textContent = format_playback_rate(state.rate); el.speedMenu.classList.remove("is-open"); el.speedButton.setAttribute("aria-expanded", "false"); render_state(); el.speedButton.focus(); announce(`Speed set to ${format_playback_rate(state.rate)}. Playback remains paused.`); });
el.speedMenu.addEventListener("keydown", (event) => { if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return; event.preventDefault(); const options = [...el.speedMenu.querySelectorAll("[data-speed]")]; const current = Math.max(0, options.indexOf(document.activeElement)); const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))); options[next].focus(); options[next].scrollIntoView({ block: "nearest" }); });
el.playPause.addEventListener("click", () => { if (state.playing) { cancel_speech(); announce("Playback paused."); } else { speak_current_sentence(); announce(`Playing ${active_section().heading}.`); } }); el.previous.addEventListener("click", () => { jump_to_sentence(state.sentenceIndex - 1); announce("Previous passage."); }); el.next.addEventListener("click", () => { jump_to_sentence(state.sentenceIndex + 1); announce("Next passage."); });
el.resumePlayback.addEventListener("click", speak_current_sentence); el.startOver.addEventListener("click", () => { el.resumeCard.hidden = true; jump_to_sentence(0); });
el.openReview.addEventListener("click", () => { render_review(); el.reviewDialog.showModal(); el.closeReview.focus(); }); el.closeReview.addEventListener("click", () => { el.reviewDialog.close(); el.openReview.focus(); });
el.downloadReview.addEventListener("click", () => { const review = render_review(); const body = `${documentTitle}\n\nSummary\n${review.summary}\n\nKey takeaways\n${review.takeaways.map((item) => `• ${item}`).join("\n")}\n`; const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `${documentTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "voxify"}-review.txt`; link.click(); URL.revokeObjectURL(url); });
el.shortcutTrigger.addEventListener("click", () => { el.shortcutDialog.showModal(); el.closeShortcuts.focus(); }); el.closeShortcuts.addEventListener("click", () => { el.shortcutDialog.close(); el.shortcutTrigger.focus(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { if (el.panel.classList.contains("is-open")) toggle_panel(false); if (el.speedMenu.classList.contains("is-open")) { el.speedMenu.classList.remove("is-open"); el.speedButton.setAttribute("aria-expanded", "false"); el.speedButton.focus(); } return; }
  const interactive = Boolean(event.target.closest("button, a, input, textarea, select, dialog, [contenteditable='true']")); const command = keyboard_command(event.key, interactive); if (!command) return; event.preventDefault();
  if (command === "toggle-playback") el.playPause.click(); else if (command === "previous-sentence" && !el.previous.disabled) el.previous.click(); else if (command === "next-sentence" && !el.next.disabled) el.next.click(); else if (command === "open-sections") toggle_panel(true); else if (command === "show-shortcuts") el.shortcutTrigger.click();
});
render_state();

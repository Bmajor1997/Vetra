# Text-to-Speech App

A prototype project exploring a simpler, more reliable, and more intelligent way to listen to text and documents.

> **Current status:** Prototype 1 implementation has begun. The first interactive listening slice is available as a dependency-free web prototype.

## Run Prototype 1

Requires Node.js 20 or newer and Python 3.11 or newer. Install the local document-extraction dependencies once:

```bash
python -m pip install -r requirements.txt
```

```bash
npm start
```

Open `http://localhost:4173`. The prototype uses the browser's built-in speech synthesis and keeps the initial voice selection intentionally simple.

Run the model tests with `npm test`.

The prototype includes the document reader, TXT/Markdown/PDF/DOCX ingestion, heading-based section navigation, sentence and word follow-along, text-aware previous/next controls, speed selection, the proportional section-dot timeline, and local resume state. During upload, the listener explicitly chooses Reading document or Worksheet document mode. Worksheet mode turns checkbox symbols and long answer blanks into interactive controls whose responses save locally; editing pauses narration. Pausing or opening a listening control preserves the highlighted word, so playback resumes from that position instead of restarting the sentence. Returning listeners recover their selected mode, document, worksheet responses, and exact position in a paused state, with explicit Resume and Start over actions. Scanned-PDF OCR, writing responses back into the original DOCX, and server-backed speech are intentionally deferred to later slices.

Finishing a document reveals one optional **Review what I heard** action. The current local prototype assembles a transparent section-based summary and key takeaways without sending document content to an external service, and the listener can download that review as a text file. AI-authored reviews can replace this local strategy later without changing the completion flow.

Playback speed is adjustable from 1× through 3× in fine 0.05× increments. Opening the compact, scrollable speed menu pauses playback, and selecting a rate leaves playback paused.

## Product Hypothesis

People already use text-to-speech tools for studying, work, accessibility, long-form reading, multitasking, and listening on the go. Existing products can generate good speech, but users may still struggle with document parsing, navigation, reliability, confusing interfaces, and understanding complex documents through audio.

The core hypothesis is:

> **Users may value a text-to-speech reader that makes documents genuinely easy to listen to—not just one that generates realistic speech.**

The initial product should focus on the reading experience rather than trying to compete with speech-model companies on raw voice-generation technology.

## Who This Could Help

Potential users include:

- People who prefer listening over reading
- Students and lifelong learners
- Professionals working through long documents
- People who listen while commuting, exercising, or multitasking
- Blind and low-vision users
- People with dyslexia, ADHD, eye strain, or other reading-related needs
- Anyone who wants an easier way to consume written information

The product should be broadly useful while following strong accessibility principles from the beginning.

## Prototype Goal

The first prototype should answer one question:

> **Can we create a listening experience that testers prefer because it is simpler, cleaner, more reliable, or easier to follow than their current approach?**

The prototype is not intended to be a full Speechify, NaturalReader, ElevenReader, or Voice Dream competitor.

## Proposed v0 Scope

The exact prototype scope will be adjusted based on tester feedback, but the current working scope is intentionally small.

### Core capabilities

- Upload a document without entering text into a form
- Upload a PDF
- Upload a DOCX document
- Extract readable text
- Perform basic document cleanup
- Convert text to speech
- Use the founder's voice as the initial product voice through an existing TTS/voice provider
- Play and pause audio
- Skip backward and forward
- Change playback speed
- Show reading/listening progress
- Resume from the user's previous position where practical
- Provide an accessible, low-complexity interface

### Early document-processing experiments

The prototype may begin recognizing simple document structure such as:

- Titles
- Headings
- Paragraphs
- Lists
- Repeated headers and footers
- Page numbers and obvious non-content artifacts

This is a potential foundation for future differentiation around intelligent document-to-audio conversion.

## What We Are NOT Building Yet

The following ideas may be valuable later, but they are explicitly out of scope for the first prototype:

- A proprietary text-to-speech model
- A proprietary voice-cloning system
- A large voice library
- An audiobook marketplace
- Podcast generation
- A general-purpose AI chatbot
- Browser extensions
- Native iOS application
- Native Android application
- Native Windows application
- Native macOS application
- Collaboration features
- Enterprise dashboards
- Dozens of integrations
- Large-scale account-management infrastructure
- Complex billing systems before payment testing requires them

These ideas should only move into active development after user evidence supports them.

## Why Use the Founder's Voice First?

Using one consented founder voice can give the early product a recognizable identity while avoiding the cost and complexity of building a large voice catalog.

For the first prototype, an existing TTS or voice-cloning provider can be used. Building proprietary voice-cloning technology is a possible future research direction, not an MVP requirement.

## Validation Before Full Development

This project follows a validation-first approach.

Before investing heavily in implementation, the project should identify approximately 5–10 potential testers who already use or could benefit from text-to-speech.

Discovery should focus on understanding:

- What they currently use for text-to-speech
- What types of content they listen to
- How frequently they use TTS
- What frustrates them most
- What regularly fails or slows them down
- Which features they actually rely on
- Whether document structure or parsing causes problems
- Whether they lose their place during long listening sessions
- Whether they use TTS for comprehension, convenience, accessibility, or another reason
- What would cause them to switch from their current solution
- What they currently pay, if anything

## Evidence We Care About

Weak evidence:

- "That's a cool idea."
- "I would probably use that."
- Feature brainstorming without real usage

Stronger evidence:

- A tester provides real documents to try
- A tester repeatedly uses the prototype
- A tester chooses it over an existing workflow
- A tester asks to keep access
- A tester refers another user
- A tester pays for continued use

The prototype should evolve based on those behaviors rather than assumptions.

## Current Opportunity Hypotheses

Several potential directions are being investigated. None are considered validated yet.

### 1. Reliable Reader

A simple reader focused on dependable playback, clean document extraction, accessible controls, position tracking, and minimal friction.

### 2. Intelligent Document Reader

A reader that understands document structure instead of blindly sending extracted text to a speech engine.

Possible future capabilities could include better handling of:

- Tables
- Footnotes
- Citations
- Figures
- Reading order
- Complex layouts
- Sections that should be summarized or explained differently when heard aloud

### 3. Learning / Comprehension Reader

A listening mode designed around retaining and understanding information rather than simply reading every word aloud.

This hypothesis requires additional validation before it becomes part of the product.

## Product Principle

The long-term opportunity is not necessarily:

> **Text → Speech**

It may instead be:

> **Document → Understanding → Accessible Speech**

However, the first version should earn the right to become that ambitious.

## Development Rule

**Do not code around customer validation.**

Before every major feature, ask:

1. What user problem does this solve?
2. What evidence shows that problem matters?
3. What is the simplest version that can test the assumption?
4. How will we know whether it worked?

If those questions cannot be answered, the feature should probably wait.

## Project Stage

**Current phase:** Problem discovery / validation planning

Immediate next steps:

1. Continue competitor and user-complaint research.
2. Identify 5–10 potential prototype testers.
3. Conduct short problem-discovery conversations or written interviews.
4. Rank the recurring problems discovered.
5. Select one primary problem for v0.
6. Define the smallest prototype that can test that problem.
7. Build and release that prototype to testers.
8. Measure actual usage and willingness to continue or pay.

## Long-Term Vision

If the core reading experience proves valuable and attracts paying users, possible later expansions include additional voices, proprietary voice technology, intelligent document processing, audiobook tools, podcast creation, conversational AI, browser extensions, native applications, collaboration, enterprise capabilities, and integrations.

Those are future possibilities—not commitments.

---

This repository intentionally begins with the product problem and validation plan before implementation code.

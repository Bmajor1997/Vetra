# Votic shared package

This directory is reserved for platform-neutral Votic business logic genuinely shared by web, mobile, and future desktop clients.

Existing web document-processing code should not be moved here until each module is reviewed for browser-only dependencies. Shared code must not depend on DOM APIs, localStorage, browser speech synthesis, React Native APIs, or platform-specific UI.

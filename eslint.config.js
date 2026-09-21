const sharedGlobals = {
  console: "readonly",
  process: "readonly",
  Buffer: "readonly",
  URL: "readonly",
  Blob: "readonly",
  fetch: "readonly",
  document: "readonly",
  window: "readonly",
  localStorage: "readonly",
  requestAnimationFrame: "readonly",
  speechSynthesis: "readonly",
  SpeechSynthesisUtterance: "readonly",
  FileReader: "readonly",
  Node: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
};

export default [
  { ignores: ["node_modules/**", "playwright-report/**", "test-results/**"] },
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: sharedGlobals },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-constant-binary-expression": "error"
    }
  }
];

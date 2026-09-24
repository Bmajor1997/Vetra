export type ImportCandidate={name:string;mimeType?:string|null;size?:number|null;uri:string};
export const MAX_DOCUMENT_BYTES=25_000_000;
export function supportedDocument(name:string){return /\.(txt|md|pdf|docx)$/i.test(name)}
export function canReadLocally(name:string){return /\.(txt|md)$/i.test(name)}
export function validateImport(candidate:ImportCandidate){if(!supportedDocument(candidate.name))throw new Error("Choose a TXT, Markdown, PDF, or Word document.");if((candidate.size||0)>MAX_DOCUMENT_BYTES)throw new Error("Document is too large. The current limit is 25 MB.");return candidate}

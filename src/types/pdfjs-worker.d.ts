// pdf.js's worker module ships without types. Importing it runs the worker on the page itself (it sets
// globalThis.pdfjsWorker, which pdf.js uses instead of a separate worker file): src/app/admin/aesthetic/IntakeLab.tsx
declare module 'pdfjs-dist/build/pdf.worker.min.mjs'

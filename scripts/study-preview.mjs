// Isolated browser harness. Reuses owned storage/scanner/database/Mailpit lifecycle.
// No build, local-app restart, retained volume or real-provider configuration.
process.env.FOXMIND_STUDY_PREVIEW='synthetic';
await import('./documentation-preview.mjs');

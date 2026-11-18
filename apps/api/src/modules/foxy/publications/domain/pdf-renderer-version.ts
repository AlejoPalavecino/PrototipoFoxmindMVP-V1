export const FOXY_PDF_RENDERER_VERSION = 'foxy-pdf-v2';
export const REPLAYABLE_FOXY_PDF_VERSIONS = ['foxy-pdf-v1', FOXY_PDF_RENDERER_VERSION] as const;
export const ACCEPTED_FOXY_PDF_VERSIONS = ['foxy-text-pdf-v1', ...REPLAYABLE_FOXY_PDF_VERSIONS] as const;
export type FoxyPdfRendererVersion = typeof REPLAYABLE_FOXY_PDF_VERSIONS[number];

export function canReplayFoxyPdf(version: string | null): version is FoxyPdfRendererVersion {
  return REPLAYABLE_FOXY_PDF_VERSIONS.some(value => value === version);
}

export function isFoxyPdfVersion(version: string): version is typeof ACCEPTED_FOXY_PDF_VERSIONS[number] {
  return ACCEPTED_FOXY_PDF_VERSIONS.some(value => value === version);
}

export function studyFileError(code: string): never { throw Object.assign(new Error(code), {code}); }

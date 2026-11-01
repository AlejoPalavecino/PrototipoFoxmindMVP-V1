import { GoogleGenAI } from '@google/genai';
import { createFoxyImageBoundedFetch } from './foxy-image-bounded-fetch.ts';
export function createFoxyGeminiClient(apiKey: string, deadlineMs: number, fetcher: typeof fetch = globalThis.fetch) {
  if (typeof apiKey !== 'string' || !apiKey || typeof fetcher !== 'function') throw Object.assign(new Error('AI_UNAVAILABLE'),{code:'AI_UNAVAILABLE'});
  return new GoogleGenAI({ apiKey, vertexai:false, httpOptions:{ fetch:createFoxyImageBoundedFetch(fetcher), timeout:deadlineMs, retryOptions:{attempts:1} } });
}

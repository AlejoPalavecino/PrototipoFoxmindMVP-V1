import { GoogleGenAI } from '@google/genai';
import type { AiConfiguration } from './configuration.ts';
import type { GeminiClient } from './gemini-client.ts';

type Configuration = Pick<AiConfiguration, 'apiKey' | 'deadlineMs'>;
const clients = new WeakMap<Configuration, { apiKey: string; deadlineMs: number; client: GeminiClient }>();

export function getGeminiClient(configuration: Pick<AiConfiguration, 'apiKey' | 'deadlineMs'>): GeminiClient {
  const { apiKey, deadlineMs } = configuration;
  const cached = clients.get(configuration);
  if (cached && cached.apiKey === apiKey && cached.deadlineMs === deadlineMs) return cached.client;
  const client = new GoogleGenAI({ apiKey, vertexai: false,
    httpOptions: { retryOptions: { attempts: 1 }, timeout: deadlineMs } });
  clients.set(configuration, { apiKey, deadlineMs, client });
  return client;
}

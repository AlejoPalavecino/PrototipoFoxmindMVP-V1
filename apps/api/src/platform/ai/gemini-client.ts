import type { CountTokensParameters, CountTokensResponse, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
export interface GeminiClient {
  models: {
    countTokens(input: CountTokensParameters): Promise<CountTokensResponse>;
    countForGeneration?(input: GenerateContentParameters): Promise<CountTokensResponse>;
    generateContent(input: GenerateContentParameters): Promise<GenerateContentResponse>;
  };
}

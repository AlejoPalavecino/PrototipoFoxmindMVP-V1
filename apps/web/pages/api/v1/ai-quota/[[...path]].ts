import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyAiQuotaRequest } from '../../../../src/application/server/ai-quota-proxy';

export const config = { api: { bodyParser: false, responseLimit: false } };
export default function handler(request: NextApiRequest, response: NextApiResponse) {
  return proxyAiQuotaRequest(request, response, process.env.FOXMIND_API_ORIGIN);
}

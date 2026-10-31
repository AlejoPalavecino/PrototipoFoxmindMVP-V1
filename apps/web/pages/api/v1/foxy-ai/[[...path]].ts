import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyFoxyRequest } from '../../../../src/lib/foxy-proxy';

export const config = { api: { bodyParser: false, responseLimit: false } };
export default function handler(request: NextApiRequest, response: NextApiResponse) {
  return proxyFoxyRequest(request, response, process.env.FOXMIND_API_ORIGIN);
}

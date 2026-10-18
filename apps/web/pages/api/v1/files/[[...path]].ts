import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyFileRequest } from '../../../../src/lib/file-proxy';

export const config = { api: { bodyParser: false, responseLimit: false } };
export default function handler(request: NextApiRequest, response: NextApiResponse) {
  return proxyFileRequest(request, response, process.env.FOXMIND_API_ORIGIN);
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyHomeRequest } from '../../../../src/application/server/home-proxy';
export const config = { api: { bodyParser: false, responseLimit: false } };
export default function handler(request: NextApiRequest, response: NextApiResponse) {
  return proxyHomeRequest(request,response,process.env.FOXMIND_API_ORIGIN);
}

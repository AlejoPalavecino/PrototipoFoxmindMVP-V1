import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyAgendaRequest } from '../../../../src/lib/agenda-proxy';

export const config = { api: { bodyParser: false, responseLimit: false } };
export default function handler(request: NextApiRequest, response: NextApiResponse) {
  return proxyAgendaRequest(request, response, process.env.FOXMIND_API_ORIGIN);
}

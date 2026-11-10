import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyClassroomRequest } from '../../../../src/application/server/classroom-proxy';

export const config = { api: { bodyParser: false, responseLimit: false } };
export default function handler(request: NextApiRequest, response: NextApiResponse) {
  return proxyClassroomRequest(request, response, process.env.FOXMIND_API_ORIGIN);
}

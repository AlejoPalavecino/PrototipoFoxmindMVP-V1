import type {NextApiRequest,NextApiResponse} from 'next';
import {proxyStudyRequest} from '../../../../src/lib/study-proxy';
export const config={api:{bodyParser:false,responseLimit:false}};
export default function handler(request:NextApiRequest,response:NextApiResponse){return proxyStudyRequest(request,response,process.env.FOXMIND_API_ORIGIN);}

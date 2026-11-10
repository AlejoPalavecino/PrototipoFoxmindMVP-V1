import type { GetServerSidePropsContext } from 'next';
/** Account documents are always private and uncached, including anonymous token pages. */
export async function accountPageProps({ res }: GetServerSidePropsContext) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return { props: {} };
}

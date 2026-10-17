import { AccountScreen } from '../src/components/account-screen';
export { accountPageProps as getServerSideProps } from '../src/lib/page-server';
export default function VerifyEmail() { return <AccountScreen view="verify-email" />; }

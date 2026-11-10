import { AccountScreen } from '../src/screens/identity-screen';
export { accountPageProps as getServerSideProps } from '../src/application/server/account-page';
export default function VerifyEmail() { return <AccountScreen view="verify-email" />; }

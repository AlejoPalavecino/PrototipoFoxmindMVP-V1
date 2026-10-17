import { AccountScreen } from '../src/components/account-screen';
export { accountPageProps as getServerSideProps } from '../src/lib/page-server';
export default function SignIn() { return <AccountScreen view="sign-in" />; }

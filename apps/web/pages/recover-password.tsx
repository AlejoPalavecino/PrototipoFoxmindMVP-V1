import { AccountScreen } from '../src/components/account-screen';
export { accountPageProps as getServerSideProps } from '../src/lib/page-server';
export default function RecoverPassword() { return <AccountScreen view="recover-password" />; }

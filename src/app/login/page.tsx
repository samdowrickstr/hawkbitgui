import styles from './styles.module.scss';
import Image from 'next/image';
import LoginFormContainer from '@/app/login/containers/login-form-container';

export default function Login() {
  return (
    <div className={styles.page}>
      <div className={styles.logoSection}>
        <div className={styles.logoContainer}>
          <Image width={220} height={91} className={styles.logo} alt='STR logo' src='/images/str-logo-white.svg' priority />
          <h1>Fleet Manager</h1>
          <p>Multi-product OTA service-pack deployment</p>
        </div>
        <div className={styles.policiesSection}>
          <div>
            <p>Powered by Eclipse hawkBit</p>
          </div>
        </div>
      </div>
      <div className={styles.loginSection}>
        <LoginFormContainer className={styles.form} />
        <div className={styles.policiesSection}>
          <div>
            <p>STR Subsea OTA management</p>
          </div>
        </div>
      </div>
    </div>
  );
}

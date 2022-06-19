import React from 'react';
import { Button } from 'react-bootstrap';
import styles from './IntroPanel.module.css';
import { NextPanelHandler } from './types';

type PropsType = {
  onNext: NextPanelHandler,
}

const IntroPanel: React.FC<PropsType> = ({ onNext }) => {
  const handleGoogleClick = () => {
    window.location.assign('/oauth-redirect/google');
  };

  const handleFacebookClick = () => {
    window.location.assign('/oauth-redirect/facebook');
  };

  const handlePrivacyPolicyClick = () => {
    window.open('/privacy-policy', '_blank');
  };

  const handleTermsOfServiceClick = () => {
    window.open('/terms-of-service', '_blank');
  };

  return (
    <div className={styles.layout}>
      <Button variant="outline-dark" onClick={handleGoogleClick}>
        <div>
          <img src="/google-svgrepo-com.svg" alt="" style={{ height: '2rem', width: '2rem' }} />
          Sign in with Google
        </div>
      </Button>
      <Button variant="outline-dark" onClick={handleFacebookClick}>
        <div>
          <img src="/2021_Facebook_icon.svg" alt="" style={{ height: '2rem', width: '2rem' }} />
          Sign in with Facebook
        </div>
      </Button>
      <Button variant="outline-dark" onClick={() => onNext('login')}>
        <div>
          <img src="/email-svgrepo-com.svg" alt="" style={{ height: '2rem', width: '2rem' }} />
          Sign in with Email
        </div>
      </Button>
      <div className={styles.finePrint}>
        <span>
          By signing in with Google, Facebook, or Email, you agree to Hiker Bubbles’s
        </span>
        <span onClick={handlePrivacyPolicyClick} className={styles.textLink}>
          privacy policy
        </span>
        <span>
          and
        </span>
        <span onClick={handleTermsOfServiceClick} className={styles.textLink}>
          terms of service
        </span>
        .
      </div>
    </div>
  );
};

export default IntroPanel;

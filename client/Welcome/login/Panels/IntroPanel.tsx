import React from 'react';
import { Button } from 'react-bootstrap';
import styles from './IntroPanel.module.css';

type PropsType = {
  onSignInWithEmailClick: () => void,
}

const IntroPanel: React.FC<PropsType> = ({ onSignInWithEmailClick }) => {
  const handleGoogleClick = () => {
    window.location.replace('/oauth-redirect/google');
  };

  const handleFacebookClick = () => {
    window.location.replace('/oauth-redirect/facebook');
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
      <Button variant="outline-dark" onClick={onSignInWithEmailClick}>
        <div>
          <img src="/email-svgrepo-com.svg" alt="" style={{ height: '2rem', width: '2rem' }} />
          Sign in with Email
        </div>
      </Button>
      <div className={styles.finePrint}>
        By signing in with Google, Facebook, or Email, you agree to Hiker Bubbles’s Privacy Policy.
      </div>
    </div>
  );
};

export default IntroPanel;

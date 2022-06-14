import React from 'react';
import { Button } from 'react-bootstrap';
import styles from './IntroPanel.module.css';

const IntroPanel: React.FC = () => {
  const handleGoogleClick = () => {
    window.location.replace('/google/redirect');
  };

  const handleFacebookClick = () => {
    window.location.replace('/facebook/redirect');
  };

  return (
    <div className={styles.layout}>
      <Button variant="outline-dark" onClick={handleGoogleClick}>
        <div>
          <img src="/btn_google_light_normal_ios.svg" alt="" style={{ height: '2rem', width: '2rem' }} />
          Sign in with Google
        </div>
      </Button>
      <Button variant="outline-dark" onClick={handleFacebookClick}>
        <div>
          <img src="/2021_Facebook_icon.svg" alt="" style={{ height: '2rem', width: '2rem' }} />
          Sign in with Facebook
        </div>
      </Button>
      <Button variant="outline-dark">
        <div>
          Sign in with Email
        </div>
      </Button>
    </div>
  );
};

export default IntroPanel;

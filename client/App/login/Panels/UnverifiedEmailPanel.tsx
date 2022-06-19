import Http from '@mortvola/http';
import React from 'react';
import { Button } from 'react-bootstrap';
import { useStore } from '../Context';
import { NextPanelHandler } from './types';
import styles from './UnverifiedEmailPanel.module.css';

type PropsType = {
  onNext: NextPanelHandler,
}

const UnverifiedEmailPanel: React.FC<PropsType> = ({ onNext }) => {
  const store = useStore();
  const handleResendClick = async () => {
    const response = await Http.post('/register/resend', {
      email: store.email,
    });

    if (response.ok) {
      onNext('verify-email');
    }
  };

  return (
    <div className={styles.layout}>
      <div>
        We found an account associated with email address
        <span>{` ${store.email}`}</span>
        . Email addresses must be
        verified before signing in. If this is your account and you would like us
        to resend the verification email again, click the button below.
      </div>
      <Button onClick={handleResendClick}>Resend the Email Verification email</Button>
    </div>
  );
};

export default UnverifiedEmailPanel;

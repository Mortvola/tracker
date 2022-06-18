import Http from '@mortvola/http';
import React from 'react';
import { Button } from 'react-bootstrap';
import { useStore } from '../Context';
import { NextPanelHandler } from './types';
import styles from './VerifyEmailPanel.module.css';

type PropsType = {
  onNext: NextPanelHandler,
}

const VerifyEmailPanel: React.FC<PropsType> = ({ onNext }) => {
  const store = useStore();

  const handleResendClick = () => {
    Http.post('/register/resend', {
      email: store.email,
    });
  };

  return (
    <div className={styles.layout}>
      <div className="alert alert-success" role="alert">
        A link to verify your email address has been sent to
        <span>{` ${store.email}`}</span>
        . Follow the instructions in the email to confirm your
        email address. Once your email address has been confirmed, click
        the Sign In button below to sign in to your account.
      </div>
      <Button onClick={() => onNext('login')}>Sign In</Button>
      <div>
        If you did not recieve the email, click the button below.
      </div>
      <Button onClick={handleResendClick}>Resend the Email Verification email</Button>
    </div>
  );
};

export default VerifyEmailPanel;

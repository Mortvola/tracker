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
        A link to verify your email address was sent to the email address you provided.
        Follow the instructions in the email to verify your email. Once your email has
        been verified, you can click the Sign In button below to sign into your account.
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

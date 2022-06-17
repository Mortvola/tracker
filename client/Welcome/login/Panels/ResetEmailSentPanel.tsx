import React from 'react';
import { Button } from 'react-bootstrap';
import { NextPanelHandler } from './types';
import styles from './ResetEmailSentPanel.module.css';

type PropsType = {
  onNext: NextPanelHandler,
}

const ResetEmailSentPanel: React.FC<PropsType> = ({ onNext }) => (
  <div className={styles.layout}>
    <div className="alert alert-success" role="alert">
      A link to reset your password was sent to the email address you provided.
      Follow the instructions in the email to reset your password.
    </div>
    <Button onClick={() => onNext('login')}>Sign In</Button>
    <div>
      If you did not recieve the email, click the button below.
    </div>
    <Button onClick={() => onNext('forgot')}>Resend the Password Reset Link</Button>
  </div>
);

export default ResetEmailSentPanel;

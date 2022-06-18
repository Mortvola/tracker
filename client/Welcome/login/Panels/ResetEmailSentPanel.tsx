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

    <div className={styles.noEmail}>
      <div>Did not receive the email?</div>
      <div onClick={() => onNext('forgot')} className={styles.textLink}>
        Resend It
      </div>
    </div>
  </div>
);

export default ResetEmailSentPanel;

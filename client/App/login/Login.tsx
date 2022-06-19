import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import LoginPanel from './Panels/LoginPanel';
import IntroPanel from './Panels/IntroPanel';
import ForgotPasswordPanel from './Panels/ForgotPasswordPanel';
import ResetEmailSentPanel from './Panels/ResetEmailSentPanel';
import RegisterPanel from './Panels/RegisterPanel';
import Waiting from './Waiting';
import { PanelTypes } from './Panels/types';
import VerifyEmailPanel from './Panels/VerifyEmailPanel';
import UnverifiedEmailPanel from './Panels/UnverifiedEmailPanel';
import { LoginContext } from './Context';

type PropsType = {
  show: boolean,
  onHide: () => void,
  onLoggedIn: () => void,
}

const Login: React.FC<PropsType> = ({
  show,
  onHide,
  onLoggedIn,
}) => {
  const [card, setCard] = useState<PanelTypes>('intro');
  const [waiting] = useState(false);

  const handleExited = () => {
    setCard('intro');
  };

  const handleNext = (next: PanelTypes) => {
    setCard(next);
  };

  let title: string | null = null;
  let panel: React.ReactElement | null = null;

  switch (card) {
    case 'intro':
      title = 'Sign In';
      panel = (
        <IntroPanel onNext={handleNext} />
      );
      break;

    case 'login':
      title = 'Sign In';
      panel = (
        <LoginPanel onNext={handleNext} onLoggedIn={onLoggedIn} />
      );
      break;

    case 'register':
      title = 'Sign Up';
      panel = <RegisterPanel onNext={handleNext} />;
      break;

    case 'forgot':
      title = 'Forgot Password';
      panel = (
        <ForgotPasswordPanel onNext={handleNext} />
      );
      break;

    case 'reset-sent':
      title = 'Reset Link';
      panel = (
        <ResetEmailSentPanel onNext={handleNext} />
      );
      break;

    case 'verify-email':
      title = 'Verify Email';
      panel = <VerifyEmailPanel onNext={handleNext} />;
      break;

    case 'unverified-email':
      title = 'Unverified Email';
      panel = <UnverifiedEmailPanel onNext={handleNext} />;
      break;

    default:
  }

  if (!title || !panel) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} onExited={handleExited}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <LoginContext>
          {panel}
        </LoginContext>
        <Waiting show={waiting} />
      </Modal.Body>
    </Modal>
  );
};

export default Login;

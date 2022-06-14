import React, { useState, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { submitForm, defaultErrors } from './submit';
import LoginPanel from './Panels/LoginPanel';
import IntroPanel from './Panels/IntroPanel';
import ForgotPasswordPanel from './Panels/ForgotPasswordPanel';
import ResetEmailSentPanel from './Panels/ResetEmailSentPanel';
import Waiting from './Waiting';

type PropsType = {
  show: boolean,
  onHide: () => void,
}

const Login: React.FC<PropsType> = ({
  show,
  onHide,
}) => {
  type PanelTypes = 'intro' | 'login' | 'forgot' | 'reset';
  const [card, setCard] = useState<PanelTypes>('intro');
  const [resetMessage, setResetMessage] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [errors, setErrors] = useState(defaultErrors);
  const formRef = useRef<HTMLFormElement>(null);

  const handleForgotPasswordClick = () => {
    setCard('forgot');
  };

  const handleRememberedPasswordClick = () => {
    setCard('login');
  };

  const handleLogin = () => {
    const form = formRef.current;

    if (form === null) {
      throw new Error('formRef is null');
    }

    setWaiting(true);
    submitForm(
      null,
      form,
      '/login',
      (responseText) => {
        if (responseText) {
          setWaiting(false);
          window.location.assign(responseText);
        }
      },
      (err) => {
        setWaiting(false);
        setErrors({ ...defaultErrors, ...err });
      },
    );
  };

  const requestResetLink: React.MouseEventHandler = (event) => {
    const form = formRef.current;

    if (form === null) {
      throw new Error('formRef is null');
    }

    setWaiting(true);
    submitForm(event, form, '/password/email', (responseText) => {
      setResetMessage(responseText);
      setCard('reset');
      setWaiting(false);
    }, (err) => {
      setWaiting(false);
      setErrors({ ...defaultErrors, ...err });
    });
  };

  const handleExited = () => {
    setCard('login');
    setResetMessage('');
    setErrors(defaultErrors);
  };

  let title: string | null = null;
  let panel: React.ReactElement | null = null;

  switch (card) {
    case 'intro':
      title = 'Login';
      panel = (
        <IntroPanel />
      );
      break;

    case 'login':
      title = 'Login';
      panel = (
        <LoginPanel
          ref={formRef}
          onHide={onHide}
          onLogin={handleLogin}
          onForgotPasswordClick={handleForgotPasswordClick}
          errors={errors}
        />
      );
      break;

    case 'forgot':
      title = 'Forgot Password';
      panel = (
        <ForgotPasswordPanel
          ref={formRef}
          onHide={onHide}
          onRememberedPasswordClick={handleRememberedPasswordClick}
          requestResetLink={requestResetLink}
          errors={errors}
        />
      );
      break;

    case 'reset':
      title = 'Reset Link';
      panel = (
        <ResetEmailSentPanel resetMessage={resetMessage} />
      );
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
        {panel}
        <Waiting show={waiting} />
      </Modal.Body>
    </Modal>
  );
};

export default Login;

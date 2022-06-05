import React, { useState, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { submitForm, defaultErrors } from './submit';
import Waiting from './Waiting';
import RegisterPanel from './RegisterPanel';
import ResetEmailSentPanel from './ResetEmailSentPanel';

type PropsType = {
  show: boolean,
  onHide: () => void,
}

const Register: React.FC<PropsType> = ({
  show,
  onHide,
}) => {
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [errors, setErrors] = useState(defaultErrors);
  const formRef = useRef<HTMLFormElement>(null);

  const handleRegister = () => {
    const form = formRef.current;

    if (form === null) {
      throw new Error('formRef is null');
    }

    setWaiting(true);
    submitForm(null, form, '/register', () => {
      setConfirmationSent(true);
      setWaiting(false);
    }, (err) => {
      setWaiting(false);
      setErrors({ ...defaultErrors, ...err });
    });
  };

  const handleExited = () => {
    setConfirmationSent(false);
    setErrors(defaultErrors);
  };

  let panel = (
    <RegisterPanel
      ref={formRef}
      onHide={onHide}
      onRegister={handleRegister}
      errors={errors}
    />
  );

  let title = 'Register';

  if (confirmationSent) {
    title = 'Reset Link';
    panel = (
      <ResetEmailSentPanel resetMessage="check your email" />
    );
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

export default Register;

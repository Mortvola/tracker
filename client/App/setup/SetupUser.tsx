import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import IntroPanel from './Panels/IntroPanel';
import UrlPanel from './Panels/UrlPanel';
import PasswordPanel from './Panels/PasswordPanel';
import { PanelTypes } from './Panels/types';
import { SetupContext } from './Context';
import TestPanel from './Panels/TestPanel';

type PropsType = {
  show: boolean,
  onHide: () => void,
  onFinish: () => void,
}

const SetupUserDialog: React.FC<PropsType> = ({
  show,
  onHide,
  onFinish,
}) => {
  const [card, setCard] = useState<PanelTypes>('intro');
  const [finished, setFinished] = useState<boolean>(false);

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
      title = 'Setup';
      panel = (
        <IntroPanel onNext={handleNext} />
      );
      break;

    case 'url':
      title = 'Setup';
      panel = (
        <UrlPanel onNext={handleNext} />
      );
      break;

    case 'password':
      title = 'Setup';
      panel = <PasswordPanel onNext={handleNext} />;
      break;

    case 'test':
      title = 'Setup';
      panel = <TestPanel onNext={handleNext} />;
      break;

    case 'finish':
      if (!finished) {
        setFinished(true);
        onFinish();
      }
      title = 'Setup';
      panel = null;
      break;

    default:
  }

  return (
    <Modal show={show} onExited={handleExited} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <SetupContext>
          {panel}
        </SetupContext>
      </Modal.Body>
    </Modal>
  );
};

export default SetupUserDialog;

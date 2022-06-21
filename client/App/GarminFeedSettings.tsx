import React from 'react';
import { makeUseModal, ModalProps } from '@mortvola/usemodal';
import Http from '@mortvola/http';
import { Button, Modal } from 'react-bootstrap';
import { FeedResponse } from '../../common/ResponseTypes';
import SubmitButton from './SubmitButton';
import GarminFeedSettingsForm, { SubmitStates } from './GarminFeedSettingsForm';

type SettingsFormPropsType = {
  setShow: (show: boolean) => void,
  user: FeedResponse,
}

const SettingsForm: React.FC<SettingsFormPropsType> = ({ setShow, user }) => {
  const [submitState, setSubmitState] = React.useState<SubmitStates>('notSubmitting');
  const handleCancelClick = () => {
    if (setShow) {
      setShow(false);
    }
  };

  const handleSubmit = (state: SubmitStates) => {
    setSubmitState(state);
    if (state === 'submitted') {
      setShow(false);
    }
  };

  return (
    <>
      <Modal.Header>
        <h4 id="modalTitle" className="modal-title">Garmin MapShare Settings</h4>
      </Modal.Header>
      <Modal.Body>
        <GarminFeedSettingsForm user={user} onSubmit={handleSubmit} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancelClick}>Cancel</Button>
        <SubmitButton
          isSubmitting={submitState === 'submitting'}
          label="Save"
          submitLabel="Saving"
          form="settings-form"
        />
      </Modal.Footer>
    </>
  );
};

const GarminFeedSettings: React.FC<ModalProps> = ({
  setShow,
}) => {
  const [user, setUser] = React.useState<FeedResponse | null>(null);

  React.useEffect(() => {
    (async () => {
      const response = await Http.get<FeedResponse>('/api/feed');

      if (response.ok) {
        const body = await response.body();

        setUser(body);
      }
    })();
  }, []);

  if (user) {
    return <SettingsForm setShow={setShow} user={user} />;
  }

  return null;
};

export const useGarminFeedSettings = makeUseModal(GarminFeedSettings);

export default GarminFeedSettings;

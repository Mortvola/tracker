import React from 'react';
import { makeUseModal, ModalProps } from '@mortvola/usemodal';
import Http from '@mortvola/http';
import { Button, Modal } from 'react-bootstrap';
import { FeedResponse } from '../../common/ResponseTypes';
import SubmitButton from './SubmitButton';
import GarminFeedSettingsForm, { SubmitStates } from './GarminFeedSettingsForm';

const SetupUserDialog: React.FC<ModalProps> = ({
  setShow,
}) => {
  const [user, setUser] = React.useState<FeedResponse | null>(null);
  const [submitState, setSubmitState] = React.useState<SubmitStates>('notSubmitting');

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
          <h4 id="modalTitle" className="modal-title">Setup</h4>
        </Modal.Header>
        <Modal.Body>
          <div>Instructions</div>
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
  }

  return null;
};

export const useSetupUserDialog = makeUseModal(SetupUserDialog);

export default SetupUserDialog;

import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import Http from '@mortvola/http';
import { NextPanelHandler } from './types';
import styles from './Panel.module.css';
import { useStore } from '../Context';
import { validateFeed } from '../../validateFeed';
import { isErrorResponse } from '../../../../common/ResponseTypes';

type PropsType = {
  onNext: NextPanelHandler,
}

const TestPanel: React.FC<PropsType> = ({
  onNext,
}) => {
  const store = useStore();
  const [status, setStatus] = React.useState<string>('');
  const [success, setSuccess] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  const handlePrevClick = () => {
    onNext('password');
  };

  const handleNextClick = () => {
    store.password = '';
    onNext('finish');
  };

  const submitForm = React.useCallback(async () => {
    if (!store.url) {
      throw new Error('url is not set');
    }

    setSubmitting(true);

    const testResult = await validateFeed(store.url, store.password ?? '');

    if (typeof testResult !== 'boolean') {
      if (isErrorResponse(testResult) && testResult.errors) {
        testResult.errors.map((e) => (
          setStatus(e.message)
        ));
      }
    }
    else {
      const response = await Http.put('/api/feed', {
        feed: store.url,
        password: store.password,
      });

      if (response.ok) {
        setStatus('Success!');
        setSuccess(true);
      }
      else {
        const body = await response.body();

        if (isErrorResponse(body) && body.errors) {
          body.errors.map((e) => (
            setStatus(e.message)
          ));
        }
      }
    }

    setSubmitting(false);
  }, [store.password, store.url]);

  React.useEffect(() => {
    submitForm();
  }, [submitForm]);

  const displayStatus = () => {
    if (success) {
      return (
        <div className={styles.status}>
          <div>
            We successfully connected to your Garmin MapShare!
          </div>
          <div>
            You are all set. If you regularly use tracking
            while on the trail, there is nothing more than needs to be done.
          </div>
          <div>
            If you don&apos;t regularly use tracking, just send one track point
            each day so we can use your location in the generation
            of the heat map.
          </div>
        </div>
      );
    }

    return (
      <div className={styles.status}>
        There seems to be a problem with connecting to your Garmin MapShare.
        <div>{status}</div>
      </div>
    );
  };

  return (
    <div className={styles.body}>
      {
        submitting
          ? (
            <div className={styles.status}>
              <div>
                We are checking on your MapShare connection...
              </div>
              <div className={styles.spinner}>
                <Spinner animation="border" />
              </div>
            </div>
          )
          : displayStatus()
      }
      <div className={styles.footer}>
        <Button onClick={handlePrevClick} disabled={submitting}>Previous</Button>
        <Button onClick={handleNextClick} disabled={!success}>Finish</Button>
      </div>
    </div>
  );
};

export default TestPanel;

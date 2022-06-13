import React from 'react';
import {
  FormikErrors,
  useField,
  FieldInputProps,
  useFormikContext,
} from 'formik';
import { makeUseModal, ModalProps } from '@mortvola/usemodal';
import { FormModal, FormField } from '@mortvola/forms';
import Http from '@mortvola/http';
import { Button } from 'react-bootstrap';
import styles from './GarminFeedSettings.module.css';
import { FeedResponse } from '../../common/ResponseTypes';

interface ValueType {
  feed: string,

  password: string,
}

type GarminAddressProps = {
  className?: string,
  style?: React.CSSProperties,
}

const GarminAddress: React.FC<GarminAddressProps & FieldInputProps<string>> = ({
  className,
  style,
  ...props
}) => {
  const [field] = useField<string>(props);

  return (
    <div className={styles.url}>
      <div>share.garmin.com/</div>
      <input
        type="text"
        className={className}
        style={style}
        {...field}
        {...props}
      />
    </div>
  );
};

type GarminErrorResponse = { status: number, statusText: string};

const TestButton: React.FC = () => {
  const { values } = useFormikContext<ValueType>();
  const [result, setResult] = React.useState<string | null>(null);

  const isGarminErrorResult = (r: unknown): r is GarminErrorResponse => (
    (r as GarminErrorResponse).status !== undefined
    && (r as GarminErrorResponse).statusText !== undefined
  );

  const handleTestClick = async () => {
    setResult('Checking...');

    try {
      const response = await Http.post('/api/feed-test', {
        feed: values.feed,
        password: values.password,
      });

      if (response.ok) {
        const body = await response.body();

        if (Array.isArray(body)) {
          if (body.length >= 2) {
            setResult('Success!');
          }
          else {
            setResult('The MapShare address may be incorrect or disabled');
          }
        }
        else if (isGarminErrorResult(body)) {
          if (body.status === 401) {
            setResult('The password may be incorrect');
          }
          else {
            setResult('An unexpected error was returned from Garmin');
          }
        }
      }
      else {
        setResult('An unexpected error occured');
      }
    }
    catch (error) {
      setResult('An unexpected error occured');
    }
  };

  return (
    <div className={styles.testButtonWrapper}>
      <Button className={styles.testButton} onClick={handleTestClick}>Test</Button>
      <div>{result}</div>
    </div>
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

  const handleSubmit = async (values: ValueType) => {
    const response = await Http.put('/api/feed', {
      feed: values.feed,
      password: values.password,
    });

    if (response.ok) {
      setShow(false);
    }
  };

  const handleValidate = () => {
    const errors: FormikErrors<ValueType> = {};

    return errors;
  };

  if (user) {
    return (
      <FormModal<ValueType>
        setShow={setShow}
        initialValues={{
          feed: user.gpsFeed ?? '',
          password: user.feedPassword ?? '',
        }}
        title="Garmin MapShare Settings"
        formId="GarminFeedSettingsForm"
        validate={handleValidate}
        onSubmit={handleSubmit}
      >
        <div className={styles.layout}>
          <FormField
            label="Garmin MapShare Address:"
            name="feed"
            as={GarminAddress}
          />
          <FormField label="Garmin MapShare Password:" name="password" />
          <TestButton />
        </div>
      </FormModal>
    );
  }

  return null;
};

export const useGarminFeedSettings = makeUseModal(GarminFeedSettings);

export default GarminFeedSettings;

import React from 'react';
import {
  FormikErrors,
  useField,
  FieldInputProps,
  useFormikContext,
  FormikHelpers,
} from 'formik';
import { makeUseModal, ModalProps } from '@mortvola/usemodal';
import { FormModal, FormField, setFormErrors } from '@mortvola/forms';
import Http from '@mortvola/http';
import { Button } from 'react-bootstrap';
import styles from './GarminFeedSettings.module.css';
import { ErrorResponse, FeedResponse, isErrorResponse, PointResponse } from '../../common/ResponseTypes';

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

const TestButton: React.FC = () => {
  const { values, setErrors } = useFormikContext<ValueType>();
  const [result, setResult] = React.useState<string | null>(null);

  const handleTestClick = async () => {
    setResult('Checking...');

    type FeedCredentials = {
      feed: string,
      password: string,
    };

    try {
      const response = await Http.post<FeedCredentials, PointResponse | ErrorResponse>('/api/feed-test', {
        feed: values.feed,
        password: values.password,
      });

      if (response.ok) {
        const body = await response.body();

        switch (body.code) {
          case 'success':
            setResult('Success!');
            break;

          case 'parse-error':
            setResult('An error occured parsing the Garmin response');
            break;

          case 'garmin-error':
            if (body.garminErrorResponse && body.garminErrorResponse.status === 401) {
              setResult('The password may be incorrect');
            }
            else {
              setResult('An unexpected error was returned from Garmin');
            }
            break;

          case 'empty-response':
            setResult('The MapShare address may be incorrect or your MapShare may be disabled');
            break;

          default:
            setResult('An unexpected error has occured');
        }
      }
      else {
        const body = await response.body();

        if (isErrorResponse(body) && body.errors) {
          setFormErrors(setErrors, body.errors);
          setResult('');
        }
        else {
          setResult('An unexpected error occured');
        }
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

  const handleSubmit = async (values: ValueType, helpers: FormikHelpers<ValueType>) => {
    const response = await Http.put('/api/feed', {
      feed: values.feed,
      password: values.password,
    });

    if (response.ok) {
      setShow(false);
    }
    else {
      const body = await response.body();

      if (isErrorResponse(body) && body.errors) {
        setFormErrors(helpers.setErrors, body.errors);
      }
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

import React, { JSXElementConstructor } from 'react';
import {
  SubmitHandler, useForm, Validate,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { makeUseModal, ModalProps } from '@mortvola/usemodal';
import Http from '@mortvola/http';
import { Button, Modal, Spinner } from 'react-bootstrap';
import styles from './GarminFeedSettings.module.css';
import {
  ErrorResponse, FeedResponse, isErrorResponse, PointResponse,
} from '../../common/ResponseTypes';
import SubmitButton from './SubmitButton';

type FormErrorPropsType = {
  name: string,
  style?: React.CSSProperties,
}

const FormError: React.FC<FormErrorPropsType> = ({ name, style }) => (
  <ErrorMessage
    name={name}
    render={({ message }) => (
      <span className="text-danger" role="alert" style={style}>
        {message}
      </span>
    )}
  />
);

interface FormValues {
  feed: string,
  password: string,
  status: string,
}

type FieldProps = {
  className?: string,
  style?: React.CSSProperties,
  readOnly?: boolean,
  autoComplete?: string,
  name?: string,
  onChange?: React.ChangeEventHandler,
  onBlur?: React.ChangeEventHandler,
  children?: React.ReactNode,
}

type GarminAddressProps = FieldProps;

const GarminAddress = React.forwardRef<HTMLInputElement, GarminAddressProps>((
  props,
  ref,
) => (
  <div className={styles.url}>
    <div>share.garmin.com/</div>
    <input
      type="text"
      {...props}
      ref={ref}
    />
  </div>
));

GarminAddress.displayName = 'GarminAddress';

const validateFeed = async (
  feed?: string,
  password?: string,
): Promise<boolean | ErrorResponse> => {
  if (feed) {
    type FeedCredentials = {
      feed: string,
      password?: string,
    };

    try {
      const response = await Http.post<FeedCredentials, PointResponse | ErrorResponse>('/api/feed-test', {
        feed,
        password,
      });

      if (response.ok) {
        return true;
      }

      const body = await response.body();

      if (isErrorResponse(body)) {
        return body;
      }
    }
    catch (error) {
      // Nothing to handle
    }

    return {
      code: 'E_FORM_ERRORS',
      errors: [{
        field: 'feed',
        message: 'An unexpected error occured',
      }],
    };
  }

  return true;
};

type FormFieldPropsType<P> = {
  name: keyof FormValues,
  label: string,
  as?: JSXElementConstructor<P>,
  type?: string,
  validate?: Validate<string>,
  deps?: string[],
} & FieldProps

type RefProps = {
  ref: React.RefCallback<HTMLInputElement>,
}

type P = FormFieldPropsType<FieldProps & RefProps>;
const FormField: React.FC<P> = ({
  validate,
  deps,
  as,
  label,
  ...props
}) => {
  // const [field, meta] = useField<V>(name)
  // const form = useFormikContext<T>();

  // const handleChange = (event: React.ChangeEvent<E>) => {
  //   field.onChange(event);
  //   if (onChange) {
  //     onChange(event, { field, form, meta });
  //   }
  // }

  // const handleBlur = (event: React.ChangeEvent<E>) => {
  //   field.onBlur(event);
  //   if (onBlur) {
  //     onBlur(event, { field, form, meta });
  //   }
  // }

  const { register } = useFormContext();

  const registerProps = register(props.name, { validate, deps });

  const Element = as;

  const { style, ...remainingProps } = props;

  if (!Element) {
    return (
      <label style={{ userSelect: 'none', marginTop: '0.5rem', ...style }}>
        {label}
        <input
          type={props.type ?? 'text'}
          {...remainingProps}
          className="form-control"
          {...registerProps}
        />
        <FormError name={registerProps.name} />
      </label>
    );
  }

  return (
    <label style={{ userSelect: 'none', marginTop: '0.5rem', ...style }}>
      {label}
      <Element
        {...props}
        className="form-control"
        {...registerProps}
      >
        {props.children}
      </Element>
      <FormError name={registerProps.name} />
    </label>
  );
};

type SettingsFormPropsType = {
  setShow: (show: boolean) => void,
  user: FeedResponse,
}

const SettingsForm: React.FC<SettingsFormPropsType> = ({ setShow, user }) => {
  const formMethods = useForm<FormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    criteriaMode: 'all',
    defaultValues: {
      feed: user.gpsFeed,
      password: user.feedPassword,
      status: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const testResult = await validateFeed(values.feed, values.password);

    if (typeof testResult !== 'boolean') {
      if (isErrorResponse(testResult) && testResult.errors) {
        testResult.errors.map((e) => (
          formMethods.setError(e.field as keyof FormValues, { type: 'validate', message: e.message })
        ));
      }
    }
    else {
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
          body.errors.map((e) => (
            formMethods.setError(e.field as keyof FormValues, { type: 'validate', message: e.message })
          ));
        }
      }
    }
  };

  const handleCancelClick = () => {
    if (setShow) {
      setShow(false);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <form className="scrollable-form" onSubmit={formMethods.handleSubmit(onSubmit)}>
        <Modal.Header>
          <h4 id="modalTitle" className="modal-title">Garmin MapShare Settings</h4>
        </Modal.Header>
        <Modal.Body>
          <div className={styles.layout}>
            <FormField
              label="Garmin MapShare Address:"
              name="feed"
              as={GarminAddress}
            />
            <FormField label="Garmin MapShare Password:" name="password" />
          </div>
        </Modal.Body>
        <Modal.Footer className={styles.multiButtons}>
          <Button variant="secondary" onClick={handleCancelClick}>Cancel</Button>
          <SubmitButton
            isSubmitting={formMethods.formState.isSubmitting}
            label="Save"
            submitLabel="Saving"
          />
        </Modal.Footer>
      </form>
    </FormProvider>
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

/* eslint-disable jsx-a11y/label-has-associated-control */
import { FormField, setFormErrors } from '@mortvola/forms';
import Http from '@mortvola/http';
import { Form, Formik, FormikHelpers } from 'formik';
import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { ErrorResponse, isErrorResponse } from '../../../../common/ResponseTypes';
import SubmitButton from '../../SubmitButton';
import { useStore } from '../Context';
import styles from './RegisterPanel.module.css';
import { NextPanelHandler } from './types';

type PropsType = {
  onNext: NextPanelHandler,
}

const RegisterPanel: React.FC<PropsType> = ({ onNext }) => {
  const store = useStore();

  type FormValues = {
    email: string,
    password: string,
    passwordConfirmation: string,
  };

  const handleSubmit = async (
    values: FormValues,
    helpers: FormikHelpers<FormValues>,
  ) => {
    type RegisterProps = {
      email: string,
      password: string,
      passwordConfirmation: string,
    }

    const response = await Http.post<RegisterProps, ErrorResponse>('/register', {
      email: values.email,
      password: values.password,
      passwordConfirmation: values.passwordConfirmation,
    });

    if (response.ok) {
      store.email = values.email;
      onNext('verify-email');
    }
    else {
      const body = await response.body();

      if (isErrorResponse(body) && body.errors) {
        setFormErrors(helpers.setErrors, body.errors);
      }
    }
  };

  return (
    <Formik<FormValues>
      initialValues={{
        email: '',
        password: '',
        passwordConfirmation: '',
      }}
      onSubmit={handleSubmit}
    >
      {
        ({ isSubmitting }) => (
          <Form className={styles.layout}>
            <FormField name="email" label="Email:" />
            <FormField
              name="password"
              label="Password:"
              type="password"
              autoComplete="new-password"
            />
            <FormField
              name="passwordConfirmation"
              label="Password Confirmation:"
              type="password"
              autoComplete="new-password"
            />

            <SubmitButton
              isSubmitting={isSubmitting}
              label="Sign Up"
              submitLabel="Signing Up"
            />

            <div className={styles.haveAccount}>
              <div>Already have an account?</div>
              <div onClick={() => onNext('intro')} className={styles.textLink}>
                Sign In
              </div>
            </div>
          </Form>
        )
      }
    </Formik>
  );
};

export default RegisterPanel;

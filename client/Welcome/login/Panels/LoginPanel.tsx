/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import {
  FormCheckbox, FormField, setFormErrors,
} from '@mortvola/forms';
import { Form, Formik, FormikHelpers } from 'formik';
import Http from '@mortvola/http';
import { Button } from 'react-bootstrap';
import styles from './LoginPanel.module.css';
import { ErrorResponse, isErrorResponse } from '../../../../common/ResponseTypes';
import { NextPanelHandler } from './types';

type PropsType = {
  onNext: NextPanelHandler,
};

const LoginPanel: React.FC<PropsType> = ({
  onNext,
}) => {
  type FormValues = {
    email: string,
    password: string,
    remember: boolean,
  }

  type CredentialsProps = {
    email: string,
    password: string,
    remember: boolean,
  }

  const handleSubmit = async (
    values: FormValues,
    helpers: FormikHelpers<FormValues>,
  ) => {
    const response = await Http.post<CredentialsProps, void | ErrorResponse>('/login', {
      email: values.email,
      password: values.password,
      remember: values.remember,
    });

    if (response.ok) {
      window.location.replace('/home');
    }
    else {
      const body = await response.body();

      if (isErrorResponse(body)) {
        setFormErrors(helpers.setErrors, body.errors);
      }
    }
  };

  return (
    <Formik<FormValues>
      initialValues={{ email: '', password: '', remember: false }}
      onSubmit={handleSubmit}
    >
      <Form className={styles.layout}>
        <FormField name="email" label="Email:" />
        <FormField name="password" label="Password:" type="password" />
        <FormCheckbox name="remember" label="Remember Me" />

        <Button type="submit">Sign In</Button>

        <div className={styles.forgotPassword}>
          <div>Forgot your password?</div>
          <div onClick={() => onNext('forgot')} className={styles.textLink}>
            Reset It
          </div>
        </div>

        <div className={styles.noAccount}>
          <div>Don&apos;t have an account?</div>
          <div onClick={() => onNext('register')} className={styles.textLink}>
            Sign Up
          </div>
        </div>
      </Form>
    </Formik>
  );
};

export default LoginPanel;

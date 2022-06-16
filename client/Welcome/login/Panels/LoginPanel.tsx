/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import { Errors, FormCheckbox, FormField } from '@mortvola/forms';
import { Form, Formik } from 'formik';
import Http from '@mortvola/http';
import { Button } from 'react-bootstrap';
import { ErrorsType } from '../submit';
import styles from './LoginPanel.module.css';

type PropsType = {
  onForgotPasswordClick: () => void,
  onSignUpClick: () => void,
  errors: ErrorsType,
};

const LoginPanel: React.FC<PropsType> = ({
  onForgotPasswordClick,
  onSignUpClick,
  errors,
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

  const handleSubmit = async (values: FormValues) => {
    const response = await Http.post<CredentialsProps, string>('/login', {
      email: values.email,
      password: values.password,
      remember: values.remember,
    });

    if (response.ok) {
      const body = await response.body();
      window.location.replace(body);
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
          <div onClick={onForgotPasswordClick} className={styles.textLink}>
            Reset It
          </div>
        </div>

        <div className={styles.noAccount}>
          <div>Don&apos;t have an account?</div>
          <div onClick={onSignUpClick} className={styles.textLink}>
            Sign Up
          </div>
        </div>
      </Form>
    </Formik>
  );
};

LoginPanel.displayName = 'LoginPanel';

export default LoginPanel;

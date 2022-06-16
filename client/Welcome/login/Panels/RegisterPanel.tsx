/* eslint-disable jsx-a11y/label-has-associated-control */
import { FormField } from '@mortvola/forms';
import Http from '@mortvola/http';
import { Form, Formik } from 'formik';
import React from 'react';
import { Button } from 'react-bootstrap';
import styles from './RegisterPanel.module.css';

type PropsType = {
  onSignInClick: () => void,
}

const RegisterPanel: React.FC<PropsType> = ({ onSignInClick }) => {
  type FormValues = {
    email: string,
    password: string,
    passwordConfirmation: string,
  };

  const handleSubmit = async (values: FormValues) => {
    type RegisterProps = {
      email: string,
      password: string,
      passwordConfirmation: string,
    }

    const response = await Http.post<RegisterProps, string>('/register', {
      email: values.email,
      password: values.password,
      passwordConfirmation: values.passwordConfirmation,
    });

    if (response.ok) {
      const body = await response.body();

      window.location.replace(body);
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

        <Button type="submit">Sign Up</Button>

        <div className={styles.haveAccount}>
          <div>Already have an account?</div>
          <div onClick={onSignInClick} className={styles.textLink}>
            Sign In
          </div>
        </div>
      </Form>
    </Formik>
  );
};

export default RegisterPanel;

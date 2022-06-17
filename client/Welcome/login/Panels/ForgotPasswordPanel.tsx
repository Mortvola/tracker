/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import { FormField, setFormErrors } from '@mortvola/forms';
import Http from '@mortvola/http';
import { Form, Formik, FormikHelpers } from 'formik';
import { Button } from 'react-bootstrap';
import styles from './ForgotPasswordPanel.module.css';
import { isErrorResponse } from '../../../../common/ResponseTypes';
import { NextPanelHandler } from './types';

type PropsType = {
  onNext: NextPanelHandler,
}

const ForgotPasswordPanel: React.FC<PropsType> = ({ onNext }) => {
  type FormValues = {
    email: string,
  }

  const handleSubmit = async (values: FormValues, helpers: FormikHelpers<FormValues>) => {
    const response = await Http.post('/password/email', {
      email: values.email,
    });

    if (response.ok) {
      onNext('reset-sent');
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
      initialValues={{ email: '' }}
      onSubmit={handleSubmit}
    >
      <Form className={styles.layout}>
        <div>
          Enter the email address that is associated with your account below. If we find an account
          with that email address we will send a reset link to that address.
        </div>
        <FormField name="email" type="email" label="E-Mail Address" autoComplete="email" />
        <Button type="submit">Send Password Reset Link</Button>
      </Form>
    </Formik>
  );
};

export default ForgotPasswordPanel;

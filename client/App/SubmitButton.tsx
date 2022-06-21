import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import styles from './SubmitButton.module.css';

type PropsType = {
  isSubmitting: boolean,
  label: string,
  submitLabel: string,
  form?: string,
}

const SubmitButton: React.FC<PropsType> = ({
  isSubmitting = false,
  label,
  submitLabel,
  form,
}) => (
  <Button
    variant="primary"
    type="submit"
    disabled={isSubmitting}
    form={form}
  >
    {
      isSubmitting
        ? (
          <>
            {submitLabel}
            <Spinner
              animation="border"
              as="span"
              size="sm"
              className={styles.spinner}
            />
          </>
        )
        : label
    }
  </Button>

);

export default SubmitButton;

import Http from '@mortvola/http';
import React from 'react';
import {
  SubmitHandler, useForm,
  FormProvider,
} from 'react-hook-form';
import {
  FeedResponse, isErrorResponse,
} from '../../common/ResponseTypes';
import { FormField } from './FormField';
import GarminAddress from './GarminAddress';
import styles from './GarminFeedSettingsForm.module.css';
import { validateFeed } from './validateFeed';

export type SubmitStates = 'notSubmitting' | 'submitting' | 'submitted';

interface FormValues {
  feed: string,
  password: string,
  status: string,
}

type PropsType = {
  user: FeedResponse,
  onSubmit: (state: SubmitStates) => void,
}

const GarminFeedSettingsForm: React.FC<PropsType> = ({
  user,
  onSubmit,
}) => {
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

  const submitForm: SubmitHandler<FormValues> = async (values) => {
    onSubmit('submitting');
    const testResult = await validateFeed(values.feed, values.password);

    if (typeof testResult !== 'boolean') {
      if (isErrorResponse(testResult) && testResult.errors) {
        testResult.errors.map((e) => (
          formMethods.setError(e.field as keyof FormValues, { type: 'validate', message: e.message })
        ));
      }

      onSubmit('notSubmitting');
    }
    else {
      const response = await Http.put('/api/feed', {
        feed: values.feed,
        password: values.password,
      });

      if (response.ok) {
        onSubmit('submitted');
      }
      else {
        const body = await response.body();

        if (isErrorResponse(body) && body.errors) {
          body.errors.map((e) => (
            formMethods.setError(e.field as keyof FormValues, { type: 'validate', message: e.message })
          ));
        }

        onSubmit('notSubmitting');
      }
    }
  };

  return (
    <FormProvider {...formMethods}>
      <form id="settings-form" className="scrollable-form" onSubmit={formMethods.handleSubmit(submitForm)}>
        <div className={styles.layout}>
          <FormField
            label="Garmin MapShare Address:"
            name="feed"
            as={GarminAddress}
          />
          <FormField label="Garmin MapShare Password:" name="password" />
        </div>
      </form>
    </FormProvider>
  );
};

export default GarminFeedSettingsForm;

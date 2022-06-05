import Http from '@mortvola/http';
import { isErrorResponse } from '../../../common/ResponseTypes';

export type ErrorsType = Record<string, string[]>;

async function submitForm(
  event: React.MouseEvent<Element, MouseEvent> | null,
  form: HTMLFormElement,
  url: string,
  success: (r: string) => void,
  fail: (errors: ErrorsType) => void,
): Promise<void> {
  const formData = new FormData(form);

  const data: Record<string, unknown> = {};

  // eslint-disable-next-line no-restricted-syntax
  for (const pair of formData.entries()) {
    [, data[pair[0]]] = pair;
  }

  const response = await Http.post<typeof data, string | ErrorsType>(url, data);

  if (response.ok) {
    if (response.headers.get('Content-Type') === 'application/json') {
      const body = await response.body();

      if (typeof body !== 'string') {
        throw new Error('response is not a string');
      }

      success(body);
    }
  }
  else if (fail) {
    if (response.status === 422) {
      const body = await response.body();
      const errors: Record<string, string[]> = {};
      if (isErrorResponse(body)) {
        body.errors.forEach((error: { rule: string, field: string, message: string }) => {
          if (errors[error.field] === undefined) {
            errors[error.field] = [];
          }

          errors[error.field] = errors[error.field].concat(error.message);
        });
        fail(errors);
      }
    }
    else {
      fail({ general: ['An error occured. Please try again later.'] });
    }
  }

  if (event) {
    event.preventDefault();
  }
}

const defaultErrors: {
  username: string[],
  password: string[],
  email: string[],
  general: string[],
} = {
  username: [],
  password: [],
  email: [],
  general: [],
};

export { submitForm, defaultErrors };

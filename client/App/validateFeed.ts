import Http from '@mortvola/http';
import { ErrorResponse, isErrorResponse, PointResponse } from '../../common/ResponseTypes';

// eslint-disable-next-line import/prefer-default-export
export const validateFeed = async (
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

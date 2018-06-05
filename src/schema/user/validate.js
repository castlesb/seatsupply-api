/* @flow */

import validator from 'validator';

import type Context from '../../Context';
import type { ValidationOutput } from '../../types';

export default function validate(input: any, ctx: Context): ValidationOutput {
  const errors = [];
  const data = {};

  if (typeof input.firstName !== 'undefined' && input.firstName.trim() !== '') {
    data.first_name = input.firstName;
  }

  if (typeof input.lastName !== 'undefined' && input.lastName.trim() !== '') {
    data.last_name = input.lastName;
  }

  if (
    typeof input.mobileNumber !== 'undefined' &&
    input.mobileNumber.trim() !== ''
  ) {
    data.mobile_number = input.mobileNumber;
  }

  if (typeof input.imageUrl !== 'undefined' && input.imageUrl.trim() !== '') {
    if (!validator.isLength(input.imageUrl, { max: 200 })) {
      errors.push({
        key: 'imageUrl',
        message: ctx.t(
          'The URL field cannot be longer than 200 characters long.',
        ),
      });
    } else if (!validator.isURL(input.imageUrl)) {
      errors.push({ key: 'imageUrl', message: ctx.t('The URL is invalid.') });
    } else {
      data.image_url = input.imageUrl;
    }
  }

  if (typeof input.locale !== 'undefined' && input.locale.trim() !== '') {
    if (!validator.isLength(input.locale, { max: 5 })) {
      errors.push({
        key: 'locale',
        message: ctx.t(
          'The locale field cannot be longer than 5 characters long.',
        ),
      });
    } else {
      data.locale = input.locale;
    }
  }

  if (typeof input.token !== 'undefined' && input.token.trim() !== '') {
    data.token = input.token;
    if (typeof input.default !== 'undefined') {
      data.default = input.default;
    }
  }

  return { data, errors };
}

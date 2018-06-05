/* @flow */

import validator from 'validator';

import { ValidationError } from '../../errors';
import type Context from '../../Context';
import type { ValidationOutput } from '../../types';

export default function validate(input: any, ctx: Context): ValidationOutput {
  const errors = [];
  const data = {};

  if (typeof input.firstName !== 'undefined' || input.firstName.trim() !== '') {
    if (!validator.isLength(input.firstName, { max: 50 })) {
      errors.push({
        key: 'firstName',
        message: ctx.t(
          'The firstName field cannot be longer than 50 characters long.',
        ),
      });
    } else {
      data.first_name = input.firstName;
    }
  }

  if (typeof input.lastName !== 'undefined' || input.lastName.trim() !== '') {
    if (!validator.isLength(input.lastName, { max: 50 })) {
      errors.push({
        key: 'lastName',
        message: ctx.t(
          'The lastName field cannot be longer than 50 characters long.',
        ),
      });
    } else {
      data.last_name = input.lastName;
    }
  }

  if (typeof input.email !== 'undefined' || input.email.trim() !== '') {
    if (!validator.isEmail(input.email)) {
      errors.push({
        key: 'email',
        message: ctx.t('The email field must be a valid email.'),
      });
    } else {
      data.email = input.email;
    }
  }

  if (
    typeof input.mobileNumber !== 'undefined' &&
    input.mobileNumber.trim() !== ''
  ) {
    if (!validator.isMobilePhone(input.mobileNumber)) {
      errors.push({
        key: 'mobileNumber',
        message: ctx.t('The mobileNumber field must be a valid phone number.'),
      });
    } else {
      data.mobile_number = input.mobileNumber;
    }
  }

  if (typeof input.quantity === 'undefined') {
    errors.push({
      key: 'quantity',
      message: ctx.t('The quantity field cannot be empty.'),
    });
  } else if (!input.quantity > 0) {
    errors.push({
      key: 'quantity',
      message: ctx.t('The quantity field must be greater than 0.'),
    });
  } else {
    data.quantity = input.quantity;
  }

  if (typeof input.token === 'undefined' && input.token.trim() !== '') {
    errors.push({
      key: 'token',
      message: ctx.t('The token field cannot be empty.'),
    });
  } else {
    data.token = input.token;
  }

  return { data, errors };
}

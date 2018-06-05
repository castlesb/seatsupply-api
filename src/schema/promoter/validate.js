/* @flow */

import validator from 'validator';

import { ValidationError } from '../../errors';
import type Context from '../../Context';
import type { ValidationOutput } from '../../types';

export default function validate(input: any, ctx: Context): ValidationOutput {
  const errors = [];
  const data = {};

  if (typeof input.name !== 'undefined' && input.name.trim() !== '') {
    if (!validator.isLength(input.name, { max: 100 })) {
      errors.push({
        key: 'name',
        message: ctx.t(
          'The name field cannot be longer than 100 characters long.',
        ),
      });
    } else {
      data.name = input.name;
    }
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

  if (
    typeof input.websiteUrl !== 'undefined' &&
    input.websiteUrl.trim() !== ''
  ) {
    if (!validator.isLength(input.websiteUrl, { max: 200 })) {
      errors.push({
        key: 'websiteUrl',
        message: ctx.t(
          'The URL field cannot be longer than 200 characters long.',
        ),
      });
    } else if (!validator.isURL(input.websiteUrl)) {
      errors.push({ key: 'websiteUrl', message: ctx.t('The URL is invalid.') });
    } else {
      data.website_url = input.websiteUrl;
    }
  }

  if (
    typeof input.description !== 'undefined' &&
    input.description.trim() !== ''
  ) {
    if (!validator.isLength(input.description, { max: 2000 })) {
      errors.push({
        key: 'description',
        message: ctx.t(
          'The text field must be no longer than 2000 characters.',
        ),
      });
    } else {
      data.description = input.description;
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

  if (typeof input.facebook !== 'undefined' && input.facebook.trim() !== '') {
    if (!validator.isURL(input.facebook)) {
      errors.push({
        key: 'facebook',
        message: ctx.t('The facebook url is invalid.'),
      });
    } else {
      data.facebook = input.facebook;
    }
  }

  if (typeof input.twitter !== 'undefined' && input.twitter.trim() !== '') {
    data.twitter = input.twitter;
  }

  if (typeof input.instagram !== 'undefined' && input.instagram.trim() !== '') {
    data.instagram = input.instagram;
  }

  if (typeof input.token !== 'undefined' && input.token.trim() !== '') {
    data.token = input.token;
  }

  if (typeof input.default !== 'undefined' && input.default.trim() !== '') {
    data.default = input.default;
  }

  if (
    typeof input.permission !== 'undefined' &&
    input.permission.trim() !== ''
  ) {
    data.permission = input.permission;
  }

  return { data, errors };
}

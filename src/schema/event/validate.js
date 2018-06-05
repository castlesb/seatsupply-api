/* @flow */

import validator from 'validator';

import type Context from '../../Context';
import type { ValidationOutput } from '../../types';

export default function validate(input: any, ctx: Context): ValidationOutput {
  const errors = [];
  const data = {};
  const currentDate = new Date();

  if (typeof input.name !== 'undefined' && input.name.trim() === '') {
    if (!validator.isLength(input.name, { max: 100 })) {
      errors.push({
        key: 'name',
        message: ctx.t('The name field must be between 1 and 100 characters.'),
      });
    } else {
      data.name = input.name;
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
          'The description field must be no longer than 2000 characters.',
        ),
      });
    } else {
      data.description = input.description;
    }
  }

  if (typeof input.startDate !== 'undefined' && input.startDate.trim() !== '') {
    const startDate = new Date(input.startDate);
    if (
      !validator.isISO8601(startDate.toISOString()) ||
      startDate < currentDate
    ) {
      errors.push({
        key: 'startDate',
        message: ctx.t('The startDate field is invalid.'),
      });
    } else if (
      typeof input.endDate !== 'undefined' &&
      input.endDate.trim() !== ''
    ) {
      const endDate = new Date(input.endDate);
      if (
        !validator.isISO8601(endDate.toISOString()) ||
        endDate < currentDate ||
        endDate < startDate
      ) {
        errors.push({
          key: 'endDate',
          message: ctx.t('The endDate field is invalid.'),
        });
      } else {
        data.end_date = endDate;
      }
    } else {
      data.start_date = startDate;
      const endDate = startDate.setUTCHours(startDate.getUTCHours() + 4);
      data.end_date = endDate;
    }
  }

  if (
    typeof input.publishDate !== 'undefined' &&
    input.publishDate.trim() !== ''
  ) {
    const publishDate = new Date(input.publishDate);
    if (
      !validator.isISO8601(publishDate.toISOString()) ||
      publishDate < currentDate
    ) {
      errors.push({
        key: 'publishDate',
        message: ctx.t('The publishDate field is invalid.'),
      });
    } else {
      data.publish_date = publishDate;
    }
  }

  if (typeof input.timezone !== 'undefined' && input.timezone.trim() !== '') {
    data.timezone = input.timezone;
  }

  if (typeof input.venueName !== 'undefined' && input.venueName.trim() !== '') {
    data.venue_name = input.venueName;
  }

  if (typeof input.address1 !== 'undefined' && input.address1.trim() !== '') {
    data.venue.address1 = input.address1;
  }

  if (typeof input.address2 !== 'undefined' && input.address2.trim() !== '') {
    data.venue.address2 = input.address2;
  }

  if (typeof input.city !== 'undefined' && input.city.trim() !== '') {
    data.venue.city = input.city;
  }

  if (typeof input.state !== 'undefined' && input.state.trim() !== '') {
    data.venue.state = input.state;
  }

  if (typeof input.country !== 'undefined' && input.country.trim() !== '') {
    data.venue.country = input.country;
  }

  if (typeof input.zip !== 'undefined' && input.zip.trim() !== '') {
    data.venue.zip = input.zip;
  }

  if (typeof input.latitude !== 'undefined' && input.latitude.trim() !== '') {
    data.venue.latitude = input.latitude;
  }

  if (typeof input.longitude !== 'undefined' && input.longitude.trim() !== '') {
    data.venue.longitude = input.longitude;
  }

  return { data, errors };
}

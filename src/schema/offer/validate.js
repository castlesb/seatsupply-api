/* @flow */

import validator from 'validator';

import { ValidationError } from '../../errors';
import type Context from '../../Context';
import type { ValidationOutput } from '../../types';

export default function validate(input: any, ctx: Context): ValidationOutput {
  const errors = [];
  const data = {};

  if (typeof input.name !== 'undefined' || input.name.trim() !== '') {
    if (!validator.isLength(input.name, { max: 100 })) {
      errors.push({
        key: 'name',
        message: ctx.t(
          'The name field must be no longer than 2000 characters.',
        ),
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
        message: t(
          'The description field must be no longer than 2000 characters.',
        ),
      });
    } else {
      data.description = input.description;
    }
  }

  if (
    typeof input.startSaleDate !== 'undefined' &&
    input.startSaleDate.trim() !== ''
  ) {
    data.start_sale_date = input.startSaleDate;
  }

  if (
    typeof input.endSaleDate !== 'undefined' &&
    input.endSaleDate.trim() !== ''
  ) {
    data.end_sale_date = input.endSaleDate;
  }

  if (typeof input.quantity !== 'undefined') {
    if (input.quantity < 1) {
      errors.push({
        key: 'quantity',
        message: ctx.t('The quantity field must be greater than 0.'),
      });
    } else {
      data.quantity = input.quantity;
    }
  }

  if (typeof input.minOrderQuantity !== 'undefined') {
    if (input.minOrderQuantity < 1) {
      errors.push({
        key: 'minOrderQuantity',
        message: ctx.t('The minOrderQuantity field must be greater than 1.'),
      });
    } else {
      data.min_order_quantity = input.minOrderQuantity;
    }
  } else {
    data.min_order_quantity = 1;
  }

  if (typeof input.maxOrderQuantity !== 'undefined') {
    if (input.maxOrderQuantity < 1) {
      errors.push({
        key: 'maxOrderQuantity',
        message: ctx.t('The maxOrderQuantity field must be greater than 0.'),
      });
    } else if (input.maxOrderQuantity < input.minOrderQuantity) {
      errors.push({
        key: 'maxOrderQuantity',
        message: ctx.t(
          'The maxOrderQuantity field cannot be less than minOrderQuantity.',
        ),
      });
    } else {
      data.max_order_quantity = input.maxOrderQuantity;
    }
  } else {
    data.max_order_quantity = 50;
  }

  if (typeof input.price !== 'undefined') {
    if (input.price < 0) {
      errors.push({
        key: 'price',
        message: ctx.t('The price field must not be less than 0.'),
      });
    } else {
      data.price = input.price * 0.05;
    }
  } else {
    data.price = 0;
  }

  return { data, errors };
}

/* @flow */

import { GraphQLNonNull, GraphQLInt } from 'graphql';
import {
  connectionDefinitions,
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
} from 'graphql-relay';

import db from '../../db';
import OfferType from './OfferType';
import type Context from '../../Context';
import OfferConnection from './OfferConnection';

const offers = {
  type: OfferConnection,
  args: forwardConnectionArgs,
  async resolve(root: any, args: any, ctx: Context) {
    const limit = typeof args.first === 'undefined' ? '10' : args.first;
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

    const [data, totalCount] = await Promise.all([
      db
        .table('offers')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .then(rows => {
          rows.forEach(x => ctx.offerById.prime(x.id, x));
          return rows;
        }),
      db
        .table('offers')
        .count()
        .then(x => x[0].count),
    ]);

    return {
      ...connectionFromArraySlice(data, args, {
        sliceStart: offset,
        arrayLength: totalCount,
      }),
      totalCount,
    };
  },
};

export default {
  offers,
};

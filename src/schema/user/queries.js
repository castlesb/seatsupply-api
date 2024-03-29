/* @flow */

import {
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
} from 'graphql-relay';

import UserType from './UserType';
import type Context from '../../Context';
import db from '../../db';

const me = {
  type: UserType,
  resolve(root: any, args: any, ctx: Context) {
    return ctx.user && ctx.userById.load(ctx.user.id);
  },
};

const users = {
  type: require('./UserConnection').default,
  args: forwardConnectionArgs,
  async resolve(root: any, args: any, ctx: Context) {
    const limit = typeof args.first === 'undefined' ? '10' : args.first;
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

    const [data, totalCount] = await Promise.all([
      db
        .table('users')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .then(rows => {
          rows.forEach(x => ctx.userById.prime(x.id, x));
          return rows;
        }),
      db
        .table('users')
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
  me,
  users,
};

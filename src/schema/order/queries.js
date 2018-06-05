import {
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
} from 'graphql-relay';

import db from '../../db';
import type Context from '../../Context';
import OrderConnection from './OrderConnection';

const orders = {
  type: OrderConnection,
  args: forwardConnectionArgs,
  async resolve(root: any, args: any, ctx: Context) {
    ctx.ensureIsAuthenticated();
    const limit = typeof args.first === 'undefined' ? '10' : args.first;
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

    const [data, totalCount] = await Promise.all([
      db
        .table('orders')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .then(rows => {
          rows.forEach(x => ctx.orderById.prime(x.id, x));
          return rows;
        }),
      db
        .table('orders')
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
  orders,
};

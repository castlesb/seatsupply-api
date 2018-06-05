/* @flow */

import {
  GraphQLUnionType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import {
  connectionDefinitions,
  globalIdField,
  fromGlobalId,
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
} from 'graphql-relay';

import db from '../../db';
import type Context from '../../Context';
import EventType from '../event/EventType';

const SearchResultItemType = new GraphQLUnionType({
  name: 'SearchResultItem',
  types: [EventType],
  resolveType(obj) {
    console.log(`OBJ: ${JSON.stringify(obj)} instance: ${obj.__type}`);
    return obj.__type === 'Event' ? EventType : null;
  },
});

const search = {
  type: connectionDefinitions({
    name: 'SearchResultItem',
    nodeType: SearchResultItemType,
    connectionFields: {
      totalCount: { type: new GraphQLNonNull(GraphQLInt) },
    },
  }).connectionType,
  args: {
    query: {
      type: GraphQLString,
    },
    ...forwardConnectionArgs,
  },
  async resolve(root: any, args: any, ctx: Context) {
    const date = new Date();
    const limit = typeof args.first === 'undefined' ? '10' : args.first;
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

    const [data, totalCount] = await Promise.all([
      db
        .table('events')
        .where(db.raw('LOWER(name) like ?', `%${args.query.toLowerCase()}%`))
        .andWhere({
          is_published: true,
          is_cancelled: false,
          is_invite_only: false,
        })
        .andWhere('end_date', '>', date)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .then(rows =>
          rows.map(row => {
            const event = Object.assign({ __type: 'Event' }, row);
            ctx.eventById.prime(event.id, event);
            return event;
          }),
        ),
      db
        .table('events')
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
  search,
};

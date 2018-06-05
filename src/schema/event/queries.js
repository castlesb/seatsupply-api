/* @flow */
/* eslint-disable global-require */

import {
  GraphQLString,
  GraphQLID,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLNonNull,
} from 'graphql';
import {
  fromGlobalId,
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
} from 'graphql-relay';

import { NotFoundError } from '../../errors';
import db from '../../db';
import type Context from '../../Context';
import TaxonomyType from './TaxonomyType';

const eventOrderField = new GraphQLEnumType({
  name: 'EventOrderField',
  values: {
    START_DATE: { value: 0 },
  },
});

const orderDirection = new GraphQLEnumType({
  name: 'OrderDirection',
  values: {
    ASC: { value: 0 },
    DESC: { value: 1 },
  },
});

const eventOrderInput = new GraphQLInputObjectType({
  name: 'EventOrder',
  fields: () => ({
    field: { type: new GraphQLNonNull(eventOrderField) },
    direction: { type: new GraphQLNonNull(orderDirection) },
  }),
});

const events = {
  type: require('./EventConnection').default,

  args: {
    ...forwardConnectionArgs,
    slug: {
      type: GraphQLString,
      description: 'Filter by slug',
    },
    startDateTime: {
      type: GraphQLString,
      description: 'Filter with a start date after this date',
    },
    endDateTime: {
      type: GraphQLString,
      description: 'Filter with a start date before this date',
    },
    venueName: {
      type: GraphQLString,
      description: 'Filter by venue name',
    },
    city: {
      type: GraphQLString,
      description: 'Filter by city',
    },
    state: {
      type: GraphQLString,
      description: 'Filter by state',
    },
    zip: {
      type: GraphQLString,
      description: 'Filter by zip',
    },
    country: {
      type: GraphQLString,
      description: 'Filter by country',
    },
    taxonomyId: {
      type: GraphQLID,
      description: 'Filter by taxonomy id',
    },
    promoterId: {
      type: GraphQLID,
      description: 'Filter by promoter id',
    },
    orderBy: { type: eventOrderInput },
  },

  async resolve(root: any, args: any, ctx: Context) {
    const limit = typeof args.first === 'undefined' ? '10' : args.first;
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0;
    const orderBy = { field: 'start_date', direction: 'desc' };

    if (args.orderBy) {
      switch (args.orderBy.field) {
        case 0:
          orderBy.field = 'start_date';
          break;
        default:
          orderBy.field = 'start_date';
      }

      switch (args.orderBy.direction) {
        case 0:
          orderBy.direction = 'asc';
          break;
        case 1:
          orderBy.direction = 'desc';
          break;
        default:
          orderBy.direction = 'desc';
      }
    }

    const query = db
      .table('events')
      .where('status', 'active')
      .orderBy(orderBy.field, orderBy.direction)
      .limit(limit)
      .offset(offset);

    if (args.slug) {
      query.where('slug', args.slug);
    }

    if (args.promoterId) {
      const { type, id } = fromGlobalId(args.promoterId);
      if (type !== 'Promoter') {
        throw new NotFoundError(
          `Could not resolve to a node with global id of '${args.promoterId}'`,
        );
      }

      query.where({ promoter_id: id });
    }

    if (args.taxonomyId) {
      const { type, id } = fromGlobalId(args.taxonomyId);
      if (type !== 'Taxonomy') {
        throw new NotFoundError(
          `Could not resolve to a node with global id of '${args.taxonomyId}'`,
        );
      }

      query.where({ taxonomy_id: id });
    }

    if (args.venueName) {
      query.whereRaw("venue->>'name' = ?", [args.venueName]);
    }

    if (args.city) {
      query.whereRaw("events.venue->>'city' = ?", [args.city]);
    }

    if (args.state) {
      query.whereRaw("venue->>'state' = ?", [args.state]);
    }

    if (args.zip) {
      query.whereRaw("venue->>'zip' = ?", [args.zip]);
    }

    if (args.country) {
      query.whereRaw("venue->>'country' = ?", [args.country]);
    }

    if (args.startDateTime) {
      query.where('start_date', '>', args.startDateTime);
    }

    if (args.endDateTime) {
      query.where('start_date', '<', args.endDateTime);
    }

    const [data, totalCount] = await Promise.all([
      query.then(rows => {
        rows.forEach(x => ctx.eventById.prime(x.id, x));
        return rows;
      }),
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

const taxonomies = {
  type: new GraphQLList(TaxonomyType),

  async resolve(root: any, args: any, ctx: Context) {
    return db
      .table('taxonomies')
      .orderBy('name', 'desc')
      .select();
  },
};

export default {
  events,
  taxonomies,
};

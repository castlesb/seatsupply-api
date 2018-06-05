/* @flow */
/* eslint-disable global-require */

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLEnumType,
} from 'graphql';
import {
  globalIdField,
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
  connectionDefinitions,
} from 'graphql-relay';

import type Context from '../../Context';
import db from '../../db';
import { nodeInterface } from '../node';
import PromoterType from '../promoter/PromoterType';
import OfferType from '../offer/OfferType';
import OrderType from '../order/OrderType';
import VenueType from './VenueType';
import TaxonomyType from './TaxonomyType';
import { ForbiddenError } from '../../errors';

const EventType = new GraphQLObjectType({
  name: 'Event',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    name: {
      type: new GraphQLNonNull(GraphQLString),
    },

    description: {
      type: GraphQLString,
    },

    startDate: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(parent) {
        return parent.start_date.toISOString();
      },
    },

    endDate: {
      type: GraphQLString,
      resolve(parent) {
        return parent.end_date.toISOString();
      },
    },

    publishDate: {
      type: GraphQLString,
      resolve(parent) {
        return parent.publish_date.toISOString();
      },
    },

    timezone: {
      type: GraphQLString,
    },

    slug: {
      type: GraphQLString,
      description: 'Event slug',
      resolve(parent) {
        return parent.slug;
      },
    },

    status: {
      type: GraphQLString,
      resolve(event) {
        return event.status;
      },
    },

    venue: {
      type: VenueType,
      resolve(event) {
        return event.venue;
      },
    },

    type: {
      type: TaxonomyType,
      description: 'Category of the event',
      resolve(event: any, args, ctx: Context) {
        return ctx.taxonomyById.load(event.taxonomy_id);
      },
    },

    promoter: {
      type: new GraphQLNonNull(PromoterType),
      description: 'The account the event belongs to',
      resolve(parent, args, ctx: Context) {
        return ctx.promoterById.load(parent.promoter_id);
      },
    },

    offers: {
      type: connectionDefinitions({
        name: 'EventOffers',
        description: 'A list of offers for the event.',
        nodeType: OfferType,
        connectionFields: {
          totalCount: { type: new GraphQLNonNull(GraphQLInt) },
        },
      }).connectionType,
      args: forwardConnectionArgs,
      async resolve(event: any, args: any, ctx: Context) {
        ctx.ensureIsAuthenticated();

        const limit = typeof args.first === 'undefined' ? '10' : args.first;
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

        const [data, totalCount] = await Promise.all([
          db
            .table('offers')
            .where('event_id', event.id)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset)
            .then(rows => {
              rows.forEach(x => ctx.offerById.prime(x.id, x));
              return rows;
            }),
          db
            .table('offers')
            .where('event_id', event.id)
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
    },

    orders: {
      type: connectionDefinitions({
        name: 'EventOrders',
        description: 'A list of orders for the event.',
        nodeType: OrderType,
        connectionFields: {
          totalCount: { type: new GraphQLNonNull(GraphQLInt) },
        },
      }).connectionType,
      args: forwardConnectionArgs,
      async resolve(event: any, args: any, ctx: Context) {
        ctx.ensureIsAuthenticated();

        const limit = typeof args.first === 'undefined' ? '10' : args.first;
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

        const [data, totalCount] = await Promise.all([
          db
            .table('orders')
            .where('event_id', event.id)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset)
            .then(rows => {
              rows.forEach(x => ctx.orderById.prime(x.id, x));
              return rows;
            }),
          db
            .table('orders')
            .where('event_id', event.id)
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
    },

    createdAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(parent) {
        return parent.created_at.toISOString();
      },
    },

    updatedAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(parent) {
        return parent.updated_at.toISOString();
      },
    },
  }),
});

export default EventType;

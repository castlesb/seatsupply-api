/* @flow */

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} from 'graphql';
import { globalIdField } from 'graphql-relay';

import db from '../../db';
import { nodeInterface } from '../node';
import type Context from '../../Context';
import EventType from '../event/EventType';

const OfferType = new GraphQLObjectType({
  name: 'Offer',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    event: {
      type: new GraphQLNonNull(EventType),
      resolve(parent, args, ctx: Context) {
        return ctx.eventById.load(parent.event_id);
      },
    },

    name: {
      type: new GraphQLNonNull(GraphQLString),
    },

    description: {
      type: GraphQLString,
    },

    price: {
      type: GraphQLInt,
    },

    quantity: {
      type: GraphQLInt,
      resolve(parent, args, ctx: Context) {
        return parent.quantity;
      },
    },

    minOrderQuantity: {
      type: GraphQLInt,
      resolve(parent, args, ctx: Context) {
        return parent.min_order_quantity;
      },
    },

    maxOrderQuantity: {
      type: GraphQLInt,
      resolve(parent, args, ctx: Context) {
        return parent.max_order_quantity;
      },
    },

    startSaleDate: {
      type: GraphQLString,
      resolve(parent, args, ctx: Context) {
        return parent.start_sale_date.toISOString();
      },
    },

    endSaleDate: {
      type: GraphQLString,
      resolve(parent, args, ctx: Context) {
        return parent.end_sale_date.toISOString();
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

export default OfferType;

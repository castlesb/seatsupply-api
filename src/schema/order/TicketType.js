/* @flow */

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
} from 'graphql';
import { globalIdField } from 'graphql-relay';

import { nodeInterface } from '../node';
import type Context from '../../Context';

const TicketType = new GraphQLObjectType({
  name: 'Ticket',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    seatDetails: {
      type: GraphQLString,
      resolve(parent, args, ctx: Context) {
        return parent.seat_details;
      },
    },

    barcode: {
      type: GraphQLString,
    },

    price: {
      type: GraphQLInt,
    },

    serviceFee: {
      type: GraphQLInt,
      resolve(parent, args, ctx: Context) {
        return parent.service_fee;
      },
    },

    status: {
      type: GraphQLString,
    },

    scannedAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(parent) {
        return parent.scanned_at.toISOString();
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

export default TicketType;

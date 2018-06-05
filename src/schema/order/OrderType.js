/* @flow */

import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import { globalIdField } from 'graphql-relay';

import db from '../../db';
import { nodeInterface } from '../node';
import type Context from '../../Context';
import UserType from '../user/UserType';
import TicketType from './TicketType';
import EventType from '../event/EventType';

export default new GraphQLObjectType({
  name: 'Order',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    event: {
      type: EventType,
      resolve(order, args, ctx: Context) {
        return ctx.eventById.load(order.event_id);
      },
    },

    user: {
      type: UserType,
      resolve(order, args, ctx: Context) {
        return ctx.userById.load(order.user_id);
      },
    },

    tickets: {
      type: new GraphQLList(TicketType),
      resolve(order, args, ctx: Context) {
        return ctx.ticketsByOrderId.load(order.id);
      },
    },

    firstName: {
      type: GraphQLString,
      resolve(order, args, ctx: Context) {
        return order.first_name;
      },
    },

    lastName: {
      type: GraphQLString,
      resolve(order, args, ctx: Context) {
        return order.last_name;
      },
    },

    email: {
      type: GraphQLString,
    },

    mobileNumber: {
      type: GraphQLString,
      resolve(order, args, ctx: Context) {
        return order.mobile_number;
      },
    },

    isRefunded: {
      type: new GraphQLNonNull(GraphQLBoolean),
      resolve(order, args, ctx: Context) {
        return order.is_refunded;
      },
    },

    createdAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(order) {
        return order.created_at.toISOString();
      },
    },

    updatedAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(order) {
        return order.updated_at.toISOString();
      },
    },
  }),
});

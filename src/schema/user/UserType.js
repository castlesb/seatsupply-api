/* @flow */
/* eslint-disable global-require */

import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
} from 'graphql';
import {
  globalIdField,
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
  connectionDefinitions,
} from 'graphql-relay';

import { nodeInterface } from '../node';
import db from '../../db';
import type Context from '../../Context';
import PromoterType from '../promoter/PromoterType';
import OrderType from '../order/OrderType';
import CardType from './CardType';

const UserType = new GraphQLObjectType({
  name: 'User',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    firstName: {
      type: GraphQLString,
      resolve(user: any, args, ctx: Context) {
        return user.first_name;
      },
    },

    lastName: {
      type: GraphQLString,
      resolve(user: any, args, ctx: Context) {
        return user.id === ctx.user.id ? user.last_name : null;
      },
    },

    imageUrl: {
      type: GraphQLString,
      resolve(user: any, args, ctx: Context) {
        return user.image_url;
      },
    },

    locale: {
      type: GraphQLString,
    },

    email: {
      type: GraphQLString,
      description: 'Email address associated with the user.',
      resolve(user: any, args, ctx: Context) {
        return user.id === ctx.user.id ? user.email : null;
      },
    },

    mobileNumber: {
      type: GraphQLString,
      description: 'Mobile phone number associated with the user.',
      resolve(user: any, args, ctx: Context) {
        return user.id === ctx.user.id ? user.mobile_number : null;
      },
    },

    promoters: {
      type: connectionDefinitions({
        name: 'UserPromoters',
        description: 'A list of promoters the user belongs to.',
        nodeType: PromoterType,
        edgeFields: {
          permission: {
            type: GraphQLString,
            resolve: edge => edge.node.permission,
          },
        },
        connectionFields: {
          totalCount: { type: new GraphQLNonNull(GraphQLInt) },
        },
      }).connectionType,
      args: forwardConnectionArgs,
      async resolve(user: any, args: any, ctx: Context) {
        if (ctx.user.id !== user.id) {
          return null;
        }

        const limit = typeof args.first === 'undefined' ? '10' : args.first;
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

        const [data, totalCount] = await Promise.all([
          db
            .table('promoters')
            .innerJoin(
              'promoter_members',
              'promoters.id',
              'promoter_members.promoter_id',
            )
            .where('promoter_members.user_id', ctx.user.id)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset)
            .then(rows =>
              rows.map(row => {
                ctx.promoterById.prime(row.id, row);
                return row;
              }),
            ),

          db
            .table('promoter_members')
            .where('user_id', ctx.user.id)
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
        name: 'UserOrders',
        description: 'A list of orders the user made.',
        nodeType: OrderType,
        connectionFields: {
          totalCount: { type: new GraphQLNonNull(GraphQLInt) },
        },
      }).connectionType,
      args: forwardConnectionArgs,
      async resolve(user: any, args: any, ctx: Context) {
        ctx.ensureIsAuthenticated();

        if (ctx.user.id !== user.id) {
          return null;
        }

        const limit = typeof args.first === 'undefined' ? '10' : args.first;
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

        const [data, totalCount] = await Promise.all([
          db
            .table('orders')
            .where('user_id', user.id)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset)
            .then(rows => {
              rows.forEach(x => ctx.orderById.prime(x.id, x));
              return rows;
            }),
          db
            .table('orders')
            .where('user_id', user.id)
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

    paymentMethods: {
      type: new GraphQLList(CardType),
      async resolve(user: any, args: any, ctx: Context) {
        if (!ctx.user || ctx.user.id !== user.id || !user.stripe_customer_id) {
          return null;
        }
        const customer = await ctx.stripeCustomerByCustomerId.load(
          user.stripe_customer_id,
        );
        return customer.sources.data;
      },
    },
  }),
});

export default UserType;

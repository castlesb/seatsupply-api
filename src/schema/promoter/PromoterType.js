/* @flow */
/* eslint-disable global-require */

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLUnionType,
  GraphQLInt,
} from 'graphql';
import {
  globalIdField,
  forwardConnectionArgs,
  connectionFromArraySlice,
  cursorToOffset,
  connectionDefinitions,
} from 'graphql-relay';

import db from '../../db';
import { nodeInterface } from '../node';
import type Context from '../../Context';
import { ForbiddenError } from '../../errors';
import BankAccountType from './BankAccountType';
import UserType from '../user/UserType';
import CardType from '../user/CardType';
import EventType from '../event/EventType';

const PayoutMethodType = new GraphQLUnionType({
  name: 'PayoutMethod',
  types: [BankAccountType, CardType],
  resolveType(obj) {
    if (obj.object === 'bank_account') {
      return BankAccountType;
    }
    return CardType;
  },
});

const PromoterType = new GraphQLObjectType({
  name: 'Promoter',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    name: {
      type: new GraphQLNonNull(GraphQLString),
    },

    description: {
      type: GraphQLString,
    },

    locale: {
      type: GraphQLString,
    },

    imageUrl: {
      type: GraphQLString,
      async resolve(organizer: any) {
        return organizer.image_url;
      },
    },

    websiteUrl: {
      type: GraphQLString,
      async resolve(organizer: any) {
        return organizer.website_url;
      },
    },

    facebook: {
      type: GraphQLString,
    },

    twitter: {
      type: GraphQLString,
    },

    instagram: {
      type: GraphQLString,
    },

    payoutMethods: {
      type: new GraphQLList(PayoutMethodType),
      async resolve(promoter: any, args: any, ctx: Context) {
        ctx.ensureIsAuthenticated();
        if (!promoter.stripe_account_id) {
          return null;
        }
        // Only admin members of the promoter can view payout methods
        const member = await db
          .table('promoter_members')
          .where({
            user_id: ctx.user.id,
            promoter_id: promoter.id,
          })
          .first('*');

        if (!member || member.permission !== 'admin') {
          throw new ForbiddenError();
        }

        const account = await ctx.stripeAccountByAccountId.load(
          promoter.stripe_account_id,
        );
        return account.external_accounts.data;
      },
    },

    members: {
      type: connectionDefinitions({
        name: 'PromoterMembers',
        nodeType: UserType,
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
      async resolve(promoter: any, args: any, ctx: Context) {
        const limit = typeof args.first === 'undefined' ? '10' : args.first;
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0;

        const [data, totalCount] = await Promise.all([
          db
            .table('users')
            .innerJoin(
              'promoter_members',
              'users.id',
              'promoter_members.user_id',
            )
            .where('promoter_members.promoter_id', promoter.id)
            .orderBy('user_id', 'desc')
            .limit(limit)
            .offset(offset)
            .then(rows => rows),
          db
            .table('users')
            .innerJoin(
              'promoter_members',
              'users.id',
              'promoter_members.user_id',
            )
            .where('promoter_members.promoter_id', promoter.id)
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

    events: {
      type: connectionDefinitions({
        name: 'PromoterEvents',
        description: 'A list of events managed by this promoter.',
        nodeType: EventType,
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
            .table('events')
            .where('promoter_id', event.promoter_id)
            .orderBy('start_date', 'desc')
            .limit(limit)
            .offset(offset)
            .then(rows => {
              rows.forEach(x => ctx.eventById.prime(x.id, x));
              return rows;
            }),
          db
            .table('events')
            .where('promoter_id', event.promoter_id)
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

export default PromoterType;

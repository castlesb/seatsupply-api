/* @flow */

import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import { fromGlobalId, mutationWithClientMutationId } from 'graphql-relay';

import db from '../../db';
import validate from './validate';
import PromoterType from './PromoterType';
import { ValidationError, NotFoundError, ForbiddenError } from '../../errors';
import type Context from '../../Context';

const stripe = require('stripe')(process.env.STRIPE_SECRET);

const createPromoter = mutationWithClientMutationId({
  name: 'CreatePromoter',

  inputFields: {
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    locale: { type: GraphQLString },
    imageUrl: { type: GraphQLString },
    websiteUrl: { type: GraphQLString },
    facebook: { type: GraphQLString },
    twitter: { type: GraphQLString },
    instagram: { type: GraphQLString },
  },

  outputFields: {
    promoter: { type: PromoterType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { data, errors } = validate(input, ctx);

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const rows = await db
      .table('promoters')
      .insert(data)
      .returning('id');

    await db.table('promoter_members').insert({
      user_id: ctx.user.id,
      promoter_id: rows[0],
      permission: 'admin',
    });

    return ctx.promoterById.load(rows[0]).then(promoter => ({ promoter }));
  },
});

const updatePromoter = mutationWithClientMutationId({
  name: 'UpdatePromoter',

  inputFields: {
    promoterId: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    locale: { type: GraphQLString },
    imageUrl: { type: GraphQLString },
    websiteUrl: { type: GraphQLString },
    facebook: { type: GraphQLString },
    twitter: { type: GraphQLString },
    instagram: { type: GraphQLString },
  },

  outputFields: {
    promoter: { type: PromoterType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id, type } = fromGlobalId(input.promoterId);
    if (type !== 'Promoter') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    let promoter = await db
      .table('promoters')
      .where({ id })
      .first('*');

    if (!promoter) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    // Only admin members of the promoter can update promoter
    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: id,
      })
      .first('*');

    if (!member) {
      throw new ForbiddenError();
    }

    const { data, errors } = validate(input, ctx);

    if (errors.length) {
      throw new ValidationError(errors);
    }

    await db
      .table('promoters')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() });

    promoter = await ctx.promoterById.load(id);

    return { promoter };
  },
});

const deletePromoter = mutationWithClientMutationId({
  name: 'DeletePromoter',

  inputFields: {
    promoterId: { type: new GraphQLNonNull(GraphQLID) },
  },

  outputFields: {
    promoterId: { type: GraphQLString },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id, type } = fromGlobalId(input.promoterId);
    if (type !== 'Promoter') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    const promoter = await db
      .table('promoters')
      .where({ id })
      .first('*');

    if (!promoter) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    // Only admin members of the promoter can update promoter
    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: id,
      })
      .first('*');

    if (!member || member.permission !== 'admin') {
      throw new ForbiddenError();
    }

    await db
      .table('promoters')
      .where({ id })
      .del();

    return { promoterId: id };
  },
});

const addPromoterPayoutMethod = mutationWithClientMutationId({
  name: 'AddPromoterPayoutMethod',

  inputFields: {
    promoterId: { type: new GraphQLNonNull(GraphQLID) },
    token: { type: new GraphQLNonNull(GraphQLString) },
    default: { type: GraphQLBoolean },
  },

  outputFields: {
    promoter: { type: PromoterType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id, type } = fromGlobalId(input.promoterId);
    if (type !== 'Promoter') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    let promoter = await db
      .table('promoters')
      .where({ id })
      .first('*');

    if (!promoter) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    // Only admin members of the promoter can update promoter
    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: id,
      })
      .first('*');

    if (!member || member.permission !== 'admin') {
      throw new ForbiddenError();
    }

    const { data, errors } = validate(input, ctx);

    if (errors.length) {
      throw new ValidationError(errors);
    }

    /* Setup stripe account if promoter does not have one. */
    if (!promoter.stripe_account_id) {
      const stripeAccount = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        product_description: 'Event tickets.',
        external_account: data.token,
      });

      promoter = await db
        .table('promoters')
        .where({ id })
        .update({ stripe_account_id: stripeAccount.id })
        .returning('*');
    } else {
      await stripe.accounts.createExternalAccount(promoter.stripe_account_id, {
        external_account: data.token,
        default_for_currency: data.default,
      });
    }

    return { promoter };
  },
});

const addMember = mutationWithClientMutationId({
  name: 'AddMember',

  inputFields: {
    promoterId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    permission: {
      type: new GraphQLNonNull(GraphQLString),
    },
  },

  outputFields: {
    promoter: { type: PromoterType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id: promoterId, type: promoterType } = fromGlobalId(
      input.promoterId,
    );
    if (promoterType !== 'Promoter') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    const promoter = await db
      .table('promoters')
      .where({ id: promoterId })
      .first('*');

    if (!promoter) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    // Only admin members of the promoter can update promoter
    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: promoterId,
      })
      .first('*');

    if (!member || member.permission !== 'admin') {
      throw new ForbiddenError();
    }

    const { type: userType, id: userId } = fromGlobalId(input.userId);

    if (userType !== 'User') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    }

    const user = await db
      .table('users')
      .where('id', userId)
      .first('*');

    if (!user) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    }

    await db.table('promoter_members').insert({
      user_id: user.id,
      promoter_id: promoterId,
      permission: input.permission,
    });

    return ctx.promoterById.load(promoterId).then(row => ({ promoter: row }));
  },
});

const removeMember = mutationWithClientMutationId({
  name: 'RemoveMember',

  inputFields: {
    promoterId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
    },
  },

  outputFields: {
    promoter: { type: PromoterType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id, type } = fromGlobalId(input.promoterId);
    if (type !== 'Promoter') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    const promoter = await db
      .table('promoters')
      .where({ id })
      .first('*');

    if (!promoter) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    // Only admin members of the promoter can update promoter
    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: id,
      })
      .first('*');

    if (!member || member.permission !== 'admin') {
      throw new ForbiddenError();
    }

    const { type: userType, id: userId } = fromGlobalId(input.userId);
    if (userType !== 'User') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    }

    const user = await db
      .table('users')
      .where('id', userId)
      .first('*');

    if (!user) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    }

    await db
      .table('promoter_members')
      .where({
        user_id: userId,
        promoter_id: id,
      })
      .del();

    return ctx.promoterById.load(id).then(row => ({ promoter: row }));
  },
});

export default {
  createPromoter,
  updatePromoter,
  deletePromoter,
  addPromoterPayoutMethod,
  addMember,
  removeMember,
};

/* @flow */

import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import { fromGlobalId, mutationWithClientMutationId } from 'graphql-relay';

import db from '../../db';
import UserType from './UserType';
import validate from './validate';
import { ValidationError, NotFoundError, ForbiddenError } from '../../errors';
import type Context from '../../Context';

const stripe = require('stripe')(process.env.STRIPE_SECRET);

const updateUser = mutationWithClientMutationId({
  name: 'UpdateUser',

  inputFields: {
    userId: { type: new GraphQLNonNull(GraphQLID) },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    imageUrl: { type: GraphQLString },
    locale: { type: GraphQLString },
    mobileNumber: { type: GraphQLString },
  },

  outputFields: {
    user: { type: UserType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id, type } = fromGlobalId(input.userId);
    if (type !== 'User') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    }

    let user = await db
      .table('user')
      .where({ id })
      .first('*');

    if (!user) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    } else if (user.id !== ctx.user.id) {
      throw new ForbiddenError();
    }

    const { data, errors } = validate(input, ctx);
    if (errors.length) {
      throw new ValidationError(errors);
    }

    await db
      .table('users')
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      });

    user = await ctx.userById.load(id);
    return { user };
  },
});

const deleteUser = mutationWithClientMutationId({
  name: 'DeleteUser',

  inputFields: {
    userId: { type: new GraphQLNonNull(GraphQLID) },
  },

  outputFields: {
    userId: { type: GraphQLString },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { type, id } = fromGlobalId(input.userId);
    if (type !== 'User') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    }

    const user = await db
      .table('users')
      .where({ id })
      .first('*');

    if (!user) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    } else if (user.id !== ctx.user.id) {
      throw new ForbiddenError();
    }

    await db
      .table('users')
      .where({ id })
      .del();

    return { userId: id };
  },
});

const addUserPaymentMethod = mutationWithClientMutationId({
  name: 'AddUserPaymentMethod',

  inputFields: {
    userId: { type: new GraphQLNonNull(GraphQLID) },
    token: { type: new GraphQLNonNull(GraphQLString) },
    default: { type: GraphQLBoolean },
  },

  outputFields: {
    user: { type: UserType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { type, id } = fromGlobalId(input.userId);
    if (type !== 'User') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    }

    const user = await db
      .table('users')
      .where({ id })
      .first('*');

    if (!user) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.userId}'`,
      );
    } else if (user.id !== ctx.user.id) {
      throw new ForbiddenError();
    }

    const { data, errors } = validate(input, ctx);
    if (errors.length) {
      throw new ValidationError(errors);
    }

    /* Setup stripe customer account if user does not have one. */
    if (!user.stripe_customer_id) {
      const stripeAccount = await stripe.customers.create({
        source: data.token,
      });

      await db
        .table('users')
        .where({ id })
        .update({ stripe_customer_id: stripeAccount.id })
        .returning('*');
    } else if (data.default === true) {
      await stripe.customers.update({
        source: data.token,
      });
    } else {
      await stripe.customers.createSource(user.stripe_customer_id, {
        source: data.token,
      });
    }

    return ctx.userById.load(user.id).then(row => ({ user: row }));
  },
});

export default {
  updateUser,
  deleteUser,
  addUserPaymentMethod,
};

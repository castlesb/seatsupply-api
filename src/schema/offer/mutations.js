/* @flow */

import { GraphQLInt, GraphQLNonNull, GraphQLID, GraphQLString } from 'graphql';
import { fromGlobalId, mutationWithClientMutationId } from 'graphql-relay';

import db from '../../db';
import type Context from '../../Context';
import OfferType from './OfferType';
import validate from './validate';
import { ValidationError, ForbiddenError, NotFoundError } from '../../errors';

const createOffer = mutationWithClientMutationId({
  name: 'CreateOffer',

  inputFields: {
    eventId: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    price: { type: GraphQLInt },
    quantity: { type: GraphQLInt },
    minOrderQuantity: { type: GraphQLInt },
    maxOrderQuantity: { type: GraphQLInt },
    startSaleDate: { type: GraphQLString },
    endSaleDate: { type: GraphQLString },
  },

  outputFields: {
    offer: { type: OfferType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { type: eventType, id: eventId } = fromGlobalId(input.eventId);

    if (eventType !== 'Event') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.eventId}'`,
      );
    }

    const event = await db
      .table('events')
      .where({
        id: eventId,
      })
      .first('*');

    if (!event) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.eventId}'`,
      );
    }

    if (event.status === 'completed' || event.status === 'cancelled') {
      throw new Error(
        'Cannot create an offer for a completed or cancelled event.',
      );
    }

    /* TODO: Implement other validation such as date checks */

    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: event.promoter_id,
      })
      .first('*');

    if (!member) {
      throw new ForbiddenError();
    }

    const { data, errors } = validate(input, ctx);
    if (errors.length) {
      throw new ValidationError(errors);
    }

    data.event_id = event.id;

    const rows = await db
      .table('offers')
      .insert(data)
      .returning('id');

    const offer = ctx.offerById.load(rows[0]);

    return { offer };
  },
});

export default {
  createOffer,
};

/* @flow */

import { GraphQLNonNull, GraphQLID, GraphQLString } from 'graphql';
import { fromGlobalId, mutationWithClientMutationId } from 'graphql-relay';
import slug from 'slug';

import db from '../../db';
import type Context from '../../Context';
import EventType from './EventType';
import validate from './validate';
import { ValidationError, ForbiddenError, NotFoundError } from '../../errors';

const createEvent = mutationWithClientMutationId({
  name: 'CreateEvent',

  inputFields: {
    promoterId: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    startDate: { type: GraphQLString },
    endDate: { type: GraphQLString },
    publishDate: { type: GraphQLString },
    venueName: { type: GraphQLString },
    address1: { type: GraphQLString },
    address2: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
    zip: { type: GraphQLString },
    country: { type: GraphQLString },
    latitude: { type: GraphQLString },
    longitude: { type: GraphQLString },
    taxonomyId: { type: GraphQLID },
  },

  outputFields: {
    event: { type: EventType },
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
      .where('id', promoterId)
      .first();

    if (!promoter) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.promoterId}'`,
      );
    }

    // Only organizer members can create events
    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: promoterId,
      })
      .first('*');

    if (!member) {
      throw new ForbiddenError();
    }

    // Validate input
    const { data, errors } = validate(input, ctx);
    if (errors.length) {
      throw new ValidationError(errors);
    }

    data.promoter_id = promoter.id;
    data.status = 'draft';

    const [event] = await db
      .table('events')
      .insert(data)
      .returning('*');

    return { event };
  },
});

const updateEvent = mutationWithClientMutationId({
  name: 'UpdateEvent',

  inputFields: {
    eventId: { type: new GraphQLNonNull(GraphQLID) },
    taxonomyId: { type: GraphQLID },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    startDate: { type: GraphQLString },
    endDate: { type: GraphQLString },
    publishDate: { type: GraphQLString },
    venueName: { type: GraphQLString },
    address1: { type: GraphQLString },
    address2: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
    zip: { type: GraphQLString },
    country: { type: GraphQLString },
    latitude: { type: GraphQLString },
    longitude: { type: GraphQLString },
  },

  outputFields: {
    event: { type: EventType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id, type } = fromGlobalId(input.eventId);
    if (type !== 'Event') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.eventId}'`,
      );
    }

    let event = await db
      .table('events')
      .where({ id })
      .first('*');

    if (!event) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.eventId}'`,
      );
    }

    if (input.taxonomyId) {
      const { id: taxonomyId, type: taxonomyType } = fromGlobalId(
        input.taxonomyId,
      );
      if (taxonomyType !== 'Taxonomy') {
        throw new NotFoundError(
          `Could not resolve to a node with global id of '${input.eventId}'`,
        );
      }

      const taxonomy = await db
        .table('taxonomies')
        .where({ id: taxonomyId })
        .first();

      if (!taxonomy) {
        throw new NotFoundError(
          `Could not resolve to a node with global id of '${input.taxonomyId}'`,
        );
      }
    }

    // Only members of the event organizer can update event
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

    /* TODO: Event update authorization checks */
    if (event.status === 'completed' || event.status === 'cancelled') {
      throw new Error(
        ctx.t(`Cannot update an event if it has been completed or cancelled.`),
      );
    }

    await db
      .table('events')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() });

    event = await ctx.eventById.load(id);

    return { event };
  },
});

const publishEvent = mutationWithClientMutationId({
  name: 'PublishEvent',

  inputFields: {
    eventId: {
      type: new GraphQLNonNull(GraphQLID),
    },
  },

  outputFields: {
    event: { type: EventType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();

    const { id, type } = fromGlobalId(input.eventId);
    if (type !== 'Event') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.eventId}'`,
      );
    }

    const [event] = await db
      .table('events')
      .leftJoin('taxonomies', 'events.taxonomy_id', 'taxonomies.id')
      .where('events.id', id)
      .select('events.*', 'taxonomies.slug as taxonomy_slug');

    if (!event) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.eventId}'`,
      );
    }

    // Only admin members of the event promoter can publish event
    const member = await db
      .table('promoter_members')
      .where({
        user_id: ctx.user.id,
        promoter_id: event.promoter_id,
        permission: 'admin',
      })
      .first('*');

    if (!member) {
      throw new ForbiddenError();
    }

    /* Some example validation. Add business rules as they apply
    if (event.status === 'cancelled') {
      throw new Error(ctx.t(`Event is cancelled.`));
    }

    if (event.status === 'active') {
      throw new Error(ctx.t(`Event is already published.`));
    }

    if (event.status === 'completed') {
      throw new Error(ctx.t(`Event is already completed.`));
    }
    */

    slug.defaults.mode = 'rfc3986';
    const eventNameSlug = slug(event.name);
    const dateSlug = slug(
      `${event.start_date.getUTCMonth()} ${event.start_date.getUTCDate()} ${event.start_date.getUTCFullYear()}`,
    );
    const venueSlug = slug(
      `${event.venue.city} ${event.venue.state} ${event.venue.name}`,
    );
    const eventSlug = `${eventNameSlug}-tickets/${dateSlug}-${venueSlug}/${
      event.taxonomy_slug
    }/${input.eventId}`;

    await db
      .table('events')
      .where({ id })
      .update({
        slug: eventSlug,
        status: 'active',
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      });

    return ctx.eventById.load(id).then(row => ({ event: row }));
  },
});

export default {
  createEvent,
  updateEvent,
  publishEvent,
};

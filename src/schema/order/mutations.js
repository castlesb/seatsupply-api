/* @flow */
/* eslint-disable no-await-in-loop */

import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLInt } from 'graphql';
import { fromGlobalId, mutationWithClientMutationId } from 'graphql-relay';
import crypto from 'crypto';
import moment from 'moment-timezone';

import db from '../../db';
import type Context from '../../Context';
import OrderType from './OrderType';
import validate from './validate';
import { ValidationError, NotFoundError } from '../../errors';
import email from './../../email';

const stripe = require('stripe')(process.env.STRIPE_SECRET);

function checkUnique(barcode: string, eventId: string) {
  return db
    .table('tickets')
    .where({ barcode, event_id: eventId })
    .select(1)
    .then(x => !x.length);
}

async function generateBarcode(eventId: string) {
  let barcode;
  let isUnique = false;
  while (!isUnique) {
    barcode = crypto
      .randomBytes(Math.ceil(12 * 3 / 4))
      .toString('base64') // convert to base64 format
      .slice(0, 12) // return required number of characters
      .replace(/\+/g, '0') // replace '+' with '0'
      .replace(/\//g, '0'); // replace '/' with '0'

    isUnique = await checkUnique(barcode, eventId);
  }
  return barcode;
}

const checkout = mutationWithClientMutationId({
  name: 'Checkout',

  inputFields: {
    offerId: { type: new GraphQLNonNull(GraphQLID) },
    quantity: { type: new GraphQLNonNull(GraphQLInt) },
    token: { type: new GraphQLNonNull(GraphQLString) },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    email: { type: GraphQLString },
    mobileNumber: { type: GraphQLString },
  },

  outputFields: {
    order: { type: OrderType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    ctx.ensureIsAuthenticated();
    // const currentDate = new Date();

    const { type: offerType, id: offerId } = fromGlobalId(input.offerId);
    if (offerType !== 'Offer') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.offerId}'`,
      );
    }

    const { data, errors } = validate(input, ctx);
    if (errors.length) {
      throw new ValidationError(errors);
    }

    const trx = db.transaction();
    try {
      const offer = await db
        .table('offers')
        // .leftJoin('offer_statuses', 'offers.status_id', 'offer_statuses.id')
        .where({ id: offerId })
        .andWhere(builder =>
          builder
            .where('quantity', '=', data.quantity)
            .orWhere('quantity', '>', data.quantity),
        )
        .first(
          'offers.*',
          // 'offer_statuses.id as status_id',
          // 'offer_statuses.name as status_name',
        );

      if (!offer) {
        throw new NotFoundError(
          `Could not resolve to a node with global id of '${input.offerId}'`,
        );
      }

      // if (offer.status !== 0) {
      // throw new Error(ctx.t(`The offer is ${offer.status_name}`));
      // }

      const event = await db
        .table('events')
        .where({
          id: offer.event_id,
          status: 'active',
        })
        .first();

      if (!event) {
        throw new NotFoundError(ctx.t(`Event not found.`));
      }

      const subtotal = offer.price * data.quantity;

      // Subtract offer quantity to reserve the tickets before charging customer
      await db
        .table('offers')
        .where({ id: offer.id })
        // .where({ status_id: 0 })
        .andWhere(builder =>
          builder
            .where('quantity', '=', data.quantity)
            .orWhere('quantity', '>', data.quantity),
        )
        .update({
          quantity: offer.quantity - data.quantity,
        })
        .transacting(trx);

      const charge = await stripe.charges.create({
        source: data.token,
        amount: subtotal * 100,
        currency: 'usd',
        description: 'Seatsupply',
        statement_descriptor: 'Seatsupply',
      });

      const [order] = await db
        .table('orders')
        .insert({
          user_id: ctx.user.id,
          event_id: event.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          mobile_number: data.mobile_number,
          stripe_charge_id: charge.id,
        })
        .transacting(trx)
        .returning('*');

      const tickets = [];
      for (let i = 0; i < data.quantity; i += 1) {
        tickets.push({
          offer_id: offer.id,
          event_id: event.id,
          order_id: order.id,
          barcode: await generateBarcode(event.id),
          status: 'unused',
          price: offer.price,
        });
      }

      await db
        .table('tickets')
        .insert(tickets)
        .transacting(trx);

      await trx.commit();
      const message = await email.render('order', {
        t: ctx.t,
        user: ctx.user,
        order_date: moment(order.created_at)
          .tz(event.timezone)
          .format(),
        event_start_date: moment(event.start_date)
          .tz(event.timezone)
          .format(),
        event,
        order,
        price: tickets[0].price,
        quantity: tickets.length,
        total: subtotal,
      });
      await email.send(message, {
        from: 'do-not-reply@seatsupply.com',
        to: order.email,
      });
      return ctx.orderById.load(order.id).then(row => ({ order: row }));
    } catch (e) {
      await trx.rollback();
      if (e.type === 'StripeCardError') {
        throw new Error(ctx.t('Card error.'));
      }
      throw e;
      // throw new Error(ctx.t('Error processing order.'));
    }
  },
});

export default {
  checkout,
};

/*
const createOrder = mutationWithClientMutationId({
  name: 'CreateOrder',

  inputFields: {
    eventId: { type: new GraphQLNonNull(GraphQLID) },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    email: { type: GraphQLString },
    mobileNumber: { type: GraphQLString },
  },

  outputFields: {
    order: { type: OrderType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    const currentDate = new Date();

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
        status: 'active',
      })
      .andWhere('end_date', '>', currentDate)
      .first();

    if (!event) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.eventId}'`,
      );
    }

    const { data, errors } = validate(input, ctx);
    if (errors.length) {
      throw new ValidationError(errors);
    }

    const [orderId] = await db
      .table('orders')
      .insert({
        ...data,
        expires_at: currentDate.setUTCMinutes(currentDate.getUTCMinutes() + 8),
      })
      .returning('id');

    return ctx.orderById.load(orderId).then(order => ({ order }));
  },
});

const addTicketToOrder = mutationWithClientMutationId({
  name: 'AddTicketToOrder',

  inputFields: {
    orderId: { type: new GraphQLNonNull(GraphQLID) },
    offerId: { type: new GraphQLNonNull(GraphQLID) },
    quantity: { type: new GraphQLNonNull(GraphQLInt) },
  },

  outputFields: {
    order: { type: OrderType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    const currentDate = new Date();

    const { type: orderType, id: orderId } = fromGlobalId(input.orderId);
    if (orderType !== 'Order') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.orderId}'`,
      );
    }

    const order = await db
      .table('orders')
      .where({ id: orderId })
      .andWhere('expires_at', '>', currentDate)
      .first();

    if (!order) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.orderId}'`,
      );
    }

    const { type: offerType, id: offerId } = fromGlobalId(input.offerId);
    if (offerType !== 'Offer') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.offerId}'`,
      );
    }

    const offer = await db
      .table('offers')
      .where({ id: offerId })
      .andWhere('sales_start_date', '<', currentDate)
      .andWhere('sales_end_date', '>', currentDate)
      .first();

    if (!offer) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.offerId}'`,
      );
    }

    const { data, errors } = validate(input, ctx);
    if (errors.length) {
      throw new ValidationError(errors);
    }

    if (offer.quantity < data.quantity) {
      throw new Error('Not enough tickets');
    }

    await db
      .table('offers')
      .where({ id: offerId })
      .update({
        quantity: offer.quantity - data.quantity,
        updated_at: db.fn.now(),
      });

    const tickets = [];
    for (let i = 0; i < data.quantity; i += 1) {
      tickets.push({
        order_id: order.id,
        offer_id: offer.id,
        price: offer.price,
        service_fee: offer.price * 0.2,
        barcode: await generateBarcode(offer.event_id),
        status: 'created',
      });
    }

    await db.table('tickets').insert(tickets);

    const rows = await db
      .table('orders')
      .insert({
        ...data,
        expires_at: currentDate.setUTCMinutes(currentDate.getUTCMinutes() + 8),
        updated_at: db.fn.now(),
      })
      .returning('id');

    return ctx.orderById.load(rows[0]).then(row => ({ order: row }));
  },
});

const payOrder = mutationWithClientMutationId({
  name: 'PayOrder',

  inputFields: {
    orderId: { type: new GraphQLNonNull(GraphQLID) },
    token: { type: new GraphQLNonNull(GraphQLString) },
  },

  outputFields: {
    order: { type: OrderType },
  },

  async mutateAndGetPayload(input: any, ctx: Context) {
    const currentDate = new Date();

    const { type: orderType, id: orderId } = fromGlobalId(input.orderId);
    if (orderType !== 'Order') {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.orderId}'`,
      );
    }

    let order = await db
      .table('orders')
      .leftJoin('tickets', 'order.id', 'tickets.order_id')
      .where('orders.id', orderId)
      .first();

    if (!order) {
      throw new NotFoundError(
        `Could not resolve to a node with global id of '${input.orderId}'`,
      );
    }

    const tickets = await db
      .table('tickets')
      .leftJoin('offers', 'tickets.offer_id', 'offers.id')
      .where('tickets.order_id', order.id)
      .select('tickets.*', 'offers.event_id as event_id');

    const trx = db.transaction();
    try {
      let subtotal = 0;
      let serviceFee = 0;

      for (const ticket of tickets) {
      }

      tickets.map(ticket =>
        generateBarcode(ticket.event_id).then(barcode => {
          subtotal += ticket.price;
          serviceFee += ticket.service_fee;

          const updatedTicket = {
            barcode,
            status: 'paid',
          };
          return Object.assign(ticket, updatedTicket);
        }),
      );

      const totalCharge = subtotal + serviceFee;
      const charge = await stripe.charges.create({
        source: input.token,
        amount: totalCharge * 100,
        currency: 'usd',
        description: 'Seatsupply',
        statement_descriptor: 'Seatsupply',
      });

      order = await db
        .table('orders')
        .where({ id: order.id })
        .update({
          stripe_charge_id: charge.id,
          status: 'paid',
          order_date: db.fn.now(),
          updated_at: db.fn.now(),
        });

      const orderIds = await db
        .insert({
          user_id: ctx.user.id,
          email: data.email,
          phone_number: data.phoneNumber,
          transaction_id: charge.id,
          order_date: date,
        })
        .into('orders')
        .transacting(trx)
        .returning('id');

      await db
        .insert({
          order_id: orderIds[0],
          ticket_id: ticket.id,
          quantity: data.quantity,
          unit_price: ticket.price,
          service_fee: serviceFee,
        })
        .into('order_items')
        .transacting(trx);

      await trx.commit();
      return ctx.orderById.load(orderIds[0]).then(order => ({ order }));
    } catch (e) {
      await trx.rollback();
      if (e.type === 'StripeCardError') {
        throw new Error(ctx.t('Card declined.'));
      }
      throw e;
      // throw new Error(ctx.t('Error processing order.'));
    }
  },
});
*/

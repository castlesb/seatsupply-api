/* @flow */
/* eslint-disable global-require */

import { nodeDefinitions, fromGlobalId } from 'graphql-relay';

import { assignType, getType } from '../utils';

export const { nodeInterface, nodeField, nodesField } = nodeDefinitions(
  (globalId, context) => {
    const { type, id } = fromGlobalId(globalId);

    switch (type) {
      case 'User':
        return context.userById.load(id).then(assignType('User'));
      case 'Promoter':
        return context.promoterById.load(id).then(assignType('Promoter'));
      case 'Event':
        return context.eventById.load(id).then(assignType('Event'));
      case 'Taxonomy':
        return context.taxonomyById.load(id).then(assignType('Taxonomy'));
      case 'Offer':
        return context.offerById.load(id).then(assignType('Offer'));
      case 'Order':
        return context.orderById.load(id).then(assignType('Order'));
      case 'Ticket':
        return context.ticketById.load(id).then(assignType('Ticket'));
      default:
        return null;
    }
  },
  obj => {
    switch (getType(obj)) {
      case 'User':
        return require('./user/UserType').default;
      case 'Promoter':
        return require('./promoter/PromoterType').default;
      case 'Event':
        return require('./event/EventType').default;
      case 'Taxonomy':
        return require('./event/TaxonomyType').default;
      case 'Offer':
        return require('./offer/OfferType').default;
      case 'Order':
        return require('./order/OrderType').default;
      case 'Ticket':
        return require('./order/TicketType').default;
      default:
        return null;
    }
  },
);

/* @flow */

import DataLoader from 'dataloader';
import type { request as Request } from 'express';
import type { t as Translator } from 'i18next';

import db from './db';
import { mapTo, mapToMany, mapToValues } from './utils';
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from './errors';

const stripe = require('stripe')(process.env.STRIPE_SECRET);

class Context {
  errors = [];
  request: Request;
  user: any;
  t: Translator;

  constructor(request: Request) {
    this.request = request;
    this.t = request.t;
  }

  get user(): any {
    return this.request.user;
  }

  /*
   * Data loaders to be used with GraphQL resolve() functions. For example:
   *
   *   resolve(post: any, args: any, { userById }: Context) {
   *     return userById.load(post.author_id);
   *   }
   *
   * For more information visit https://github.com/facebook/dataloader
   */

  userById = new DataLoader(keys =>
    db
      .table('users')
      .whereIn('id', keys)
      .select()
      .then(mapTo(keys, x => x.id)),
  );

  promoterById = new DataLoader(keys =>
    db
      .table('promoters')
      .whereIn('id', keys)
      .select()
      .then(mapTo(keys, x => x.id)),
  );

  eventById = new DataLoader(keys =>
    db
      .table('events')
      .whereIn('id', keys)
      .select()
      .then(mapTo(keys, x => x.id)),
  );

  ticketById = new DataLoader(keys =>
    db
      .table('tickets')
      .whereIn('id', keys)
      .select()
      .then(mapTo(keys, x => x.id)),
  );

  offerById = new DataLoader(keys =>
    db
      .table('offers')
      .whereIn('id', keys)
      .select()
      .then(mapTo(keys, x => x.id)),
  );

  orderById = new DataLoader(keys =>
    db
      .table('orders')
      .whereIn('id', keys)
      .select()
      .then(mapTo(keys, x => x.id)),
  );

  ticketsByOrderId = new DataLoader(keys =>
    db
      .table('tickets')
      .whereIn('order_id', keys)
      .select()
      .then(mapToMany(keys, x => x.order_id)),
  );

  taxonomyById = new DataLoader(keys =>
    db
      .table('taxonomies')
      .whereIn('id', keys)
      .select()
      .then(mapTo(keys, x => x.id)),
  );

  taxonomiesByParentId = new DataLoader(keys =>
    db
      .table('taxonomies')
      .whereIn('parent_id', keys)
      .select()
      .then(mapToMany(keys, x => x.parent_id)),
  );

  stripeCustomerByCustomerId = new DataLoader(keys =>
    Promise.all(keys.map(key => stripe.customers.retrieve(key))),
  );

  stripeAccountByAccountId = new DataLoader(keys =>
    Promise.all(keys.map(key => stripe.accounts.retrieve(key))),
  );

  /*
   * Authentication and permissions.
   */

  ensureIsAuthenticated() {
    if (!this.user) throw new UnauthorizedError();
  }

  /*
   * Authorization
   * ------------------------------------------------------------------------ */

  ensureIsAuthorized(check) {
    if (!this.user) {
      throw new UnauthorizedError();
    }

    if (check && !check(this.user)) {
      throw new ForbiddenError();
    }
  }
}

export default Context;

/* @flow */

import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';

export default new GraphQLObjectType({
  name: 'BankAccount',

  fields: {
    name: {
      type: GraphQLString,
      resolve(source: any) {
        return source.account_holder_name;
      },
    },

    bankName: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(source: any) {
        return source.bank_name;
      },
    },

    country: {
      type: GraphQLString,
    },

    currency: {
      type: new GraphQLNonNull(GraphQLString),
    },

    last4: {
      type: GraphQLString,
    },

    routingNumber: {
      type: GraphQLString,
      resolve(source: any) {
        return source.routing_number;
      },
    },
  },
});

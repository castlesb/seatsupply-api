/* @flow */

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
} from 'graphql';

export default new GraphQLObjectType({
  name: 'Card',

  fields: {
    name: {
      type: GraphQLString,
    },

    address1: {
      type: GraphQLString,
      resolve(source: any) {
        return source.address_line_1;
      },
    },

    address2: {
      type: GraphQLString,
      resolve(source: any) {
        return source.address_line_2;
      },
    },

    city: {
      type: GraphQLString,
      resolve(source: any) {
        return source.address_city;
      },
    },

    state: {
      type: GraphQLString,
      resolve(source: any) {
        return source.address_state;
      },
    },

    country: {
      type: GraphQLString,
    },

    zip: {
      type: GraphQLString,
      resolve(source: any) {
        return source.address_zip;
      },
    },

    brand: {
      type: GraphQLString,
    },

    last4: {
      type: GraphQLString,
    },

    expirationMonth: {
      type: GraphQLInt,
      resolve(source: any) {
        return source.exp_month;
      },
    },

    expirationYear: {
      type: GraphQLInt,
      resolve(source: any) {
        return source.exp_year;
      },
    },
  },
});

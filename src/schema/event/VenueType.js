/* @flow */

import { GraphQLObjectType, GraphQLString } from 'graphql';

export default new GraphQLObjectType({
  name: 'Venue',
  fields: {
    name: {
      type: GraphQLString,
      resolve(venue) {
        return venue.name;
      },
    },

    address1: {
      type: GraphQLString,
      resolve(venue) {
        return venue.address_1;
      },
    },

    address2: {
      type: GraphQLString,
      resolve(venue) {
        return venue.address_2;
      },
    },

    city: {
      type: GraphQLString,
    },

    state: {
      type: GraphQLString,
    },

    zip: {
      type: GraphQLString,
    },

    country: {
      type: GraphQLString,
    },

    latitude: {
      type: GraphQLString,
    },

    longitude: {
      type: GraphQLString,
    },
  },
});

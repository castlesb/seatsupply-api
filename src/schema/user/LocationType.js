/* @flow */

import { GraphQLObjectType, GraphQLString } from 'graphql';

export default new GraphQLObjectType({
  name: 'Location',

  fields: {
    address1: {
      type: GraphQLString,
    },

    address2: {
      type: GraphQLString,
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

    googlePlaceId: {
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

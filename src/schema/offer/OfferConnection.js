/* @flow */

import { GraphQLNonNull, GraphQLInt } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';

import OfferType from './OfferType';

export default connectionDefinitions({
  name: 'Offer',
  nodeType: OfferType,
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
}).connectionType;

/* @flow */

import { GraphQLNonNull, GraphQLInt } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';

import PromoterType from './PromoterType';

export default connectionDefinitions({
  name: 'Promoter',
  nodeType: PromoterType,
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
}).connectionType;

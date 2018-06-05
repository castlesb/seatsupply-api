/* @flow */

import { GraphQLNonNull, GraphQLInt } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';

import OrderType from './OrderType';

export default connectionDefinitions({
  name: 'Order',
  nodeType: OrderType,
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
}).connectionType;

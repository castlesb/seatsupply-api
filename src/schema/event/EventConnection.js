/* @flow */

import { GraphQLNonNull, GraphQLInt } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';

import EventType from './EventType';

export default connectionDefinitions({
  name: 'Event',
  nodeType: EventType,
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
}).connectionType;

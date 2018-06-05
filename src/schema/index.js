/* @flow */

import { GraphQLSchema, GraphQLObjectType } from 'graphql';

import userQueries from './user/queries';
import userMutations from './user/mutations';
import promoterQueries from './promoter/queries';
import promoterMutations from './promoter/mutations';
import eventQueries from './event/queries';
import eventMutations from './event/mutations';
import offerQueries from './offer/queries';
import offerMutations from './offer/mutations';
import orderQueries from './order/queries';
import orderMutations from './order/mutations';
import search from './search/queries';
import { nodeField, nodesField } from './node';

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      node: nodeField,
      nodes: nodesField,
      ...userQueries,
      ...promoterQueries,
      ...eventQueries,
      ...offerQueries,
      ...orderQueries,
      ...search,
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      ...userMutations,
      ...promoterMutations,
      ...eventMutations,
      ...offerMutations,
      ...orderMutations,
    },
  }),
});

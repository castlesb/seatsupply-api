/* @flow */

import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import { globalIdField } from 'graphql-relay';
import { nodeInterface } from '../node';

const TaxonomyType = new GraphQLObjectType({
  name: 'Taxonomy',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    parent: {
      type: TaxonomyType,
      resolve(parent, args, ctx: Context) {
        return parent.parent_id && ctx.taxonomyById.load(parent.parent_id);
      },
    },

    name: {
      type: new GraphQLNonNull(GraphQLString),
    },

    slug: {
      type: new GraphQLNonNull(GraphQLString),
    },
  }),
});

export default TaxonomyType;

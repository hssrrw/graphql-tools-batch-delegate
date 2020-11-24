import { ApolloServer, gql } from 'apollo-server';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { delegateToSchema } from '@graphql-tools/delegate';
import { GraphQLObjectType } from 'graphql';

const posts = [
  {
    id: 0,
    text: 'Lorem ipsum',
    userId: 0,
  },
  {
    id: 1,
    text: 'Hello graphql-tools',
    userId: 1,
  },
  {
    id: 2,
    text: 'Example post',
    userId: 0,
  },
]

const users = [
  {
    id: 0,
    name: 'Sarah',
  },
  {
    id: 1,
    name: 'Alice',
  },
]

let postSchema = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      text: String
      userId: ID!
    }
    type PostConnection {
      items: [Post]!
      total: Int!
    }
    type Query {
      post(id: ID!): Post
      postsByIds(ids: [ID!]!): PostConnection!
      allPosts: PostConnection!
    }
  `,
  resolvers: {
    Query: {
      post: {
        resolve: (_, args) => posts.find(post => String(post.id) === args.id),
      },
      allPosts: () => ({ items: posts }),
      postsByIds: {
        resolve: (_, args) => {
          const items = args.ids.map(
            (id: string) => posts.find(
              post => String(post.id) === id
            )
          );
          return {
            items,
            total: items.length
          };
        },
      },
    },
  },
});

let userSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      name: String
    }
    type UserConnection {
      items: [User]!
      total: Int!
    }
    type Query {
      user(id: ID!): User
      usersByIds(ids: [ID!]!): UserConnection!
      allUsers: UserConnection!
    }
  `,
  resolvers: {
    Query: {
      user: {
        resolve: (_, args) => users.find(user => String(user.id) === args.id),
      },
      allUsers: () => ({ items: users }),
      usersByIds: {
        resolve: (_, args) => {
          const items = args.ids.map(
            (id: string) => users.find(
              user => String(user.id) === id
            )
          );
          return {
            items,
            total: items.length
          };
        },
      },
    },
  },
});

const schema = stitchSchemas({
  subschemas: [postSchema, userSchema],
  typeDefs: `
    extend type Post {
      user: User
    }
  `,
  resolvers: {
    Post: {
      user: {
        selectionSet: `{ userId }`,
        resolve(post, _args, context, info) {
          //
          // This works:
          //
          // return delegateToSchema({
          //   schema: userSchema,
          //   operation: 'query',
          //   fieldName: 'user',
          //   args: { id: post.userId },
          //   context,
          //   info,
          // });

          //
          // This doesn't:
          //
          return batchDelegateToSchema({
            schema: userSchema,
            operation: 'query',
            fieldName: 'usersByIds',
            key: post.userId,
            argsFromKeys: (ids) => ({ ids }),
            returnType: userSchema.getType('UserConnection') as GraphQLObjectType,
            valuesFromResults: (results, keys) => {
              // `results` is always `null` here
              console.log({ results, keys });
              return keys.map(() => null)
            },
            context,
            info,
          });
        },
      },
    },
  },
});

const init = async () => {
  try {
    const server = new ApolloServer({ schema });
    server.listen().then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  } catch (err) {
    console.error(err);
  }
};

init();

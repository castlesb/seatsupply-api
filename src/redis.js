/* @flow */

import redis from 'redis';
import bluebird from 'bluebird';
import errors from './errors';

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(process.env.REDIS_URL);

client.on('error', errors.report); // eslint-disable-line no-console

export default client;

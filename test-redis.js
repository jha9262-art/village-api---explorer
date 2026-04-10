const redis = require('redis');

const client = redis.createClient({
  url: 'redis://default:A4Bn0peMtfZNn2NdimipsBCmeH0gKGnD@redis-18157.crce182.ap-south-1-1.ec2.cloud.redislabs.com:18157',
  legacyMode: true
});

client.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

client.connect().then(() => {
  console.log('Redis client connected successfully');
  client.quit();
}).catch(err => {
  console.error('Failed to connect:', err.message);
});
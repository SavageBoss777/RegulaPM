import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const dbName = process.env.DB_NAME === 'your_database_name' ? 'regulapm_nexus' : (process.env.DB_NAME || 'regulapm_nexus');
  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;
  return db;
}

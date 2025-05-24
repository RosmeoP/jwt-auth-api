import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const url = process.env.MONGO_URI;
const dbName = 'mydb'; 

let db = null;

export const connectDB = async () => {
  if (db) return db;

  const client = new MongoClient(url);
  await client.connect();
  console.log('MongoDB connected');

  db = client.db(dbName);
  return db;
};

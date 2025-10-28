import { MongoClient } from 'mongodb';
import 'dotenv/config';

const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/');
const db = client.db(process.env.MONGO_DB || 'bancoTrabalho');

export default db;
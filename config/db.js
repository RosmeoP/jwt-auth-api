import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs'; // ✅ correct import for bcryptjs

const url = process.env.MONGO_URI;

const saltRounds = 10;
const plainPassword = 'mauricio14$VR';

// Hash password before DB connection
const hashedPassword = bcrypt.hashSync(plainPassword, saltRounds);

MongoClient.connect(url)
  .then(client => {
    console.log('Connected successfully');

    const dbo = client.db('mydb');
    const myObj = {
      email: 'vrosmeo@gmail.com',
      password: hashedPassword
    };

    return dbo.collection('users').insertOne(myObj).then(() => {
      console.log('1 document inserted with hashed password');
      client.close();
    });
  })
  .catch(error => {
    console.error('Connection error:', error.message);
  });

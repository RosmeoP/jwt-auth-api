import dotenv from 'dotenv';
dotenv.config(); 
import { MongoClient } from 'mongodb';

const url = process.env.MONGO_URI;

MongoClient.connect(url)
  .then(client => {
    console.log('Connected successfully');

    const dbo = client.db('mydb');
    const myObj = { email: 'test@gmail.com', password: 'admin' };

    return dbo.collection('users').insertOne(myObj).then(() => {
      console.log('1 document inserted');
      client.close();
    });
  })
  .catch(error => {
    console.error('Connection error:', error.message);
  });

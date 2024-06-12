let db;

import { MongoClient } from "mongodb";

async function connectToDb(cb){
    const client = new MongoClient(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.rbdw2ky.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`);
    await client.connect();

     db=client.db('react-blog-db');
     cb();
}

export {
    db,
    connectToDb,
};
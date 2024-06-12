import fs from 'fs';
import admin from 'firebase-admin';
import express from "express";
import path from 'path';
import { MongoClient } from "mongodb";
import 'dotenv/config';
import {db,connectToDb} from './db.js'
import { fileURLToPath } from 'url';
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);

const credentials=JSON.parse(
    fs.readFileSync('./credentials.json')
);

admin.initializeApp({
    credential: admin.credential.cert(credentials),
})

const app=express();
app.use(express.json());
app.use(express.static(path.join(__dirname,'../build')));
app.get(/^(?!\/api).+/,(req,res)=>{
    res.sendFile(path.join(__dirname,'../build/index.html'))
})

app.use(async(req,res,next)=>{
    const {authtoken}=req.headers;
    if(authtoken){
        try{
            req.user=await admin.auth().verifyIdToken(authtoken);
        }
        catch(e){
            return res.sendStatus(400);

        }
    }
    req.user=req.user||{};
    next();
})

app.get('/apis/articles/:name',async (req,res)=>{
    const { name }=req.params;
    const { uid }=req.user;
    const article=await db.collection('articles').findOne({name});
    if(article){
        const upvoteIDs=article.upvoteIDs || [];
        article.canUpvote=uid && !upvoteIDs.includes(uid); 
    res.json(article);
    }
    else
    res.sendStatus(404).send("Article doesn't exist");



})

app.use((req,res,next)=>{
    if(req.user){
        next();
    }
    else{
            res.sendStatus(401);
    }
})

app.put('/apis/articles/:name/upvote',async (req,res)=>{
    const {name}=req.params;
    const { uid } = req.user;
    const article=await db.collection('articles').findOne({name});

    if(article){
        const upvoteIDs=article.upvoteIDs || [];
        const canUpvote=uid && !upvoteIDs.includes(uid); 
        if(canUpvote){
            await db.collection('articles').updateOne({name},{
                $inc:{upvotes:1},
                $push:{upvoteIDs:uid},
            });
        }
        const updatedArticle=await db.collection('articles').findOne({name});
        res.json(updatedArticle);
    }
    else
    res.send (`article ${name} doesn't exists `);

})

app.post('/apis/articles/:name/comments',async (req,res)=>{
    const {name}=req.params;
    const { text}=req.body;
    const {email}=req.user;

    await db.collection('articles').updateOne({name},{
        $push:{comments:{postedBy:email,text}}
    })
    const article=await db.collection('articles').findOne({name});
   
    if(article){
        res.json(article)
    }
    else
    res.send (`article ${name} doesn't exists `);
})


// app.post('/hello', (req,res)=>{
//     console.log(req.body);
//     res.send(`Hellooo ${req.body.name}! `);
// });


// app.get('/hello/:name/:lastname',(req,res)=>{
//     const name=req.params.name;
//     console.log(req.params);
//     res.send(`hii ${name}`);
// })

const PORT = process.env.PORT||8000;

connectToDb(()=>{
    console.log('successfully connected to DB');

    app.listen(PORT,()=>{
    console.log("Server is listening on port"+PORT);
});
});
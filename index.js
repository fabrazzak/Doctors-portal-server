
const express = require('express');
const app = express();
const cors = require('cors');
 require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.prckl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('WelCome To Doctors Portal Server')
})

async function run (){
    try{
        await client.connect();
        const serviceCollection= client.db("doctors_portal").collection("services");
        app.get('/service', async(req,res)=>{
            const query={};
            const cursor= serviceCollection.find(query);
            const service= await cursor.toArray();
            res.send(service);
        })

    }
    finally{

    }

}
run().catch(console.dir)


app.listen(port, () => {
    console.log(`Doctors-Portal  on port ${port}`)
})

const express = require('express');
const app = express();
const cors = require('cors');
 require('dotenv').config();
 const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const query = require('express/lib/middleware/query');
const res = require('express/lib/response');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.prckl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('WelCome To Doctors Portal Server')
})
function verifyJWT (req,res,next){
    const authHeader= req.headers.authorization;
    if (!authHeader){
        return res.status(401).send({ message: "UnAuthorize access"})
    }
    
    const token=authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,function(err,decoded){
        if(err){
            return res.status(403).send({message: "Forbidden access"})
        }
        req.decoded=decoded;
        next();
    })
    
   
    
}

async function run (){
    try{
        await client.connect();
        const serviceCollection= client.db("doctors_portal").collection("services");
        const bookingCollection= client.db("doctors_portal").collection("booking");
        const userCollection= client.db("doctors_portal").collection("user");
        app.get('/service', async(req,res)=>{
            const query={};
            const cursor= serviceCollection.find(query);
            const service= await cursor.toArray();
            res.send(service);
        })


        // available service 
        app.get('/available',async(req,res)=>{
            const date = req.query.date;
            //  step 1  get all service

            const services = await serviceCollection.find().toArray();
            //  step 2 get the booking service of that day 
            const query = {date: date};
            const booking = await bookingCollection.find(query).toArray();

            // step 3 for each service , find booking for that service
            services.forEach(service =>{
                const serviceBooking = booking.filter(b => b.treatment === service.name);
                const  booked = serviceBooking.map(s => s.slot);
                service.booked=booked;
                service.slots= service.slots.filter(s => ! booked.includes(s));               
                
            })  



            res.send(services);
        })
        // make admin 
        app.put('/user/admin/:email', verifyJWT,async(req,res)=>{
            const email=req.params.email; 
           const requester=req.decoded.email.email;
            const requseterAccount = await userCollection.findOne({ email: requester
});
           console.log(requseterAccount)
           if(requseterAccount.role === "admin"){
               const filter = { email: email };
               const updateDoc = {
                   $set: { role: "admin" }
               };
               const result = await userCollection.updateOne(filter, updateDoc);
               res.send(result);

           }else{
               res.status(403).send({message:"Forbidden"})
           }

           

        })
        // user 
        app.put('/user/:email', async(req,res)=>{
            const e=req.params;           
            const user = req.body.currentUser;
            const filter={email:e.email};
            const options = { upsert: true };
            const updateDoc = {
                $set: {user}
            };
            const result = await userCollection.updateOne(filter,updateDoc,options);
            const token = jwt.sign({ email: e }, process.env.ACCESS_TOKEN_SECRET,{expiresIn:"1h"}) ;
            res.send({result,token});

        })
        
        // user appointment 

        app.get('/booking', verifyJWT ,async(req,res)=>{
            const email=req.query.email;
            const decodedEmail=req.decoded.email.email;
            if(email  === decodedEmail){
                const query={email: email};
                const booking = await bookingCollection.find(query).toArray();    
                res.send(booking);
            }
            else{
                return res.status(403).send({message: "Forbidden access"})
            }

        })
       

        // get all admin 
        app.get("/admin/:email", async(req,res)=>{
            const email=req.params.email;
            const user = await userCollection.findOne({email:email});
            const isAdmin = user.role === "admin";
            console.log(isAdmin)
            
            res.send({admin:isAdmin});

        })
        // get all user for admin 
        app.get("/user",verifyJWT, async(req,res)=>{
            const user = await userCollection.find().toArray();
            res.send(user);

        })

        // post booking 
        app.post("/booking",async(req,res)=>{
            const booking= req.body;
            const query={treatment:booking.treatment,data:booking.data,patient:booking.patient}
            const exist= await bookingCollection.findOne(query);
            if(exist){
                return res.send({success:false,exist})
            }
            const result= await bookingCollection.insertOne(booking)
            return res.send({success:true,result});
            
        })

    }
    finally{

    }

}
run().catch(console.dir)


app.listen(port, () => {
    console.log(`Doctors-Portal  on port ${port}`)
})
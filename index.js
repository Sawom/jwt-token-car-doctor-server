const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// jwt token
const jwt = require('jsonwebtoken');
// cookies k backend e anar jnno cookie parser use hoy
const cookieParser = require('cookie-parser');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    // server side theke send korar jnno
    origin: ['http://localhost:5173'], //local host tai
    credentials: true
}));
app.use(express.json());
// call cookieParser
app.use(cookieParser());

// console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bsdjaxv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = async(req, res, next)=>{
    const token = req.cookies?.token;
    console.log('value of token', token);
    if(!token){
        return res.status(401).send({message:'not authorized'})
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        // error
        if(err){
            console.log(err);
            return res.status(401).send({message:'unauthorized'})
        }

        // if token is not valid then it would be decoded
        console.log('value in the token', decoded);
        // user infov diye dicchi sathe
        req.user = decoded;
        next();
    })
   
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('jwtToken').collection('services');
        const bookingCollection = client.db('jwtToken').collection('bookings');

        // ***auth related api, jwt token****
        app.post('/jwt', async(req, res)=>{
            const user = req.body;
            console.log(user);
            // generate token
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '5h'})
            
            // store in cokies
            res
            .cookie('token', token, {
                httpOnly: true,
                secure: false,
                 // server and client same jaygay na. tai none dea

            })
            .send({success: true})
        })


        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };

            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })


        // bookings 
        app.get('/bookings', verifyToken, async (req, res) => {
            console.log(req.query.email);
            console.log('token taken', req.cookies.token);
            console.log('user in the valid token',req.user);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            console.log(updatedBooking);
            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('car doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port ${port}`)
})
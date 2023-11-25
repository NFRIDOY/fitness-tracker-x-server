// npm i express cors mongodb dotenv 
// add .gitignore

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const jwt = require("jsonwebtoken"); // npm install jsonwebtoken
const cookieParser = require("cookie-parser"); // npm install cookie-parser

const app = express();
const port = process.env.PORT || 5000;

// Middleware
// app.use(cors());
app.use(cors({
    origin: ["https://fitness-tracker-x.web.app", "http://localhost:5173", "http://localhost:5174"],
    // origin: ["https://job-market-x.web.app"],
    credentials: true
}));
app.use(express.json());
// app.use(express.json());
app.use(cookieParser())

// handle Requests
// let userArray = [];
// const handleRequests = (user) => {
//     // userArray.push(user);
// }

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    const emailReq = req.query.email;

    console.log(token);
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access, No Token' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized Access' })
        }
        console.log("verifyToken: verify")
        console.log("decoded", decoded)
        req.user = decoded;
        // if (req.user.email === emailReq) {
        //     return res.status(403).send({ message: 'Forbiden Access' })
        // }

        next()
    })
}

// use verify admin after verifyToken
const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
    }
    next();
}

// console.log(process.env.DB_USER)
// console.log(process.env.DB_PASS)
// console.log(process.env.URI)
const uri = process.env.URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // /api/v1/jwt
        app.post("/api/v1/jwt", async (req, res) => {
            try {
                const user = req.body;
                // console.log(user)
                const token = await jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,
                    {
                        expiresIn: '1h'
                    }
                )

                // console.log("token", token)
                console.log("Grenarrated token")

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',

                })
                    .send({ message: 'true' })
            } catch (error) {
                console.log(error)
            }
        })

        // DB

        const database = client.db("FitnessTrackerXDB");
        const usersCollection = database.collection("Users");
        const subscribersCollection = database.collection("subscribers");

        app.get('/api/v1/logout', async (req, res) => {
            // const user = req.body;
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

        app.post("/api/v1/users", async (req, res) => {
            // const userEmail = req.body.email
            // const userName = req.body.name
            // const userRole = req.body.role

            // const userOne = {
            //     userName,
            //     userEmail,
            //     userRole
            // }

            const user = req.body;

            const filter = { email: user?.email };
            // console.log(filter)
            console.log(user.role)

            const existingUser = await usersCollection.findOne(filter);
            console.log(existingUser)

            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            else {
                if (user.role) {
                    const result = await usersCollection.insertOne(user);
                    res.send(result);
                }
                else {
                    const { name, email } = user
                    const options = { upsert: true };

                    const updateRole = {
                        $set: {
                            name: name,
                            email: email,
                            role: "member"
                        },
                    };
                    const result = await usersCollection.updateOne(filter, updateRole, options);
                    res.send(result)
                }

            }

            // const updateDoc = {
            //     $set: {
            //         name: userName,
            //         email: userEmail,
            //         role: userRole
            //     },
            // };

        })

        // Logout 



        app.post('/api/v1/subscribers', async (req, res) => {
            const subscriber = req.body;
            const filter = { email: subscriber.email };
            console.log(filter)

            const existingUser = await subscribersCollection.findOne(filter);
            if (existingUser) {
                return res.send({ message: 'subscriber already exists', insertedId: null })
            }
            else {
                const result = await subscribersCollection.insertOne(subscriber);
                res.send(result);
            }
        })





        client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Server is Running X");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
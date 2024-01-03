// npm i express cors mongodb dotenv 
// add .gitignore

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const forumsCollection = database.collection("forums");
        // const trainersCollection = database.collection("trainers");

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
            // console.log(user.role)

            const existingUser = await usersCollection.findOne(filter);
            // console.log(existingUser)

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
                    console.log(user.role)
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

        app.get("/api/v1/users", async (req, res) => {

            const userEmail = req.query.email;

            const filter = { email: userEmail };
            // console.log(user.role)

            const result = await usersCollection.findOne(filter);
            // console.log(result)
            res.send(result)
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

        app.get('/api/v1/subscribers', async (req, res) => {
            const result = await subscribersCollection.find().toArray();
            res.send(result);
        })

        // Triner applying
        app.put('/api/v1/trainers', async (req, res) => {
            const trainer = req.body;
            // console.log("trainer", trainer)
            console.log(trainer.email)
            const filter = { email: trainer.email };
            const options = { upsert: true };
            // const existingUser = await usersCollection.findOne(filter);
            // if (existingUser) {
            //     return res.send({ message: 'trainer already exists', insertedId: null })
            // }
            // else {
            // console.log(applyTrainer)
            const applyTrainer = {
                $set: {
                    email: trainer.email,
                    fullName: trainer.fullName,
                    age: trainer.age,
                    description: trainer.description,
                    skills: trainer.skills,
                    // week: trainer.week,
                    // day: trainer.day,
                    weeklyDays: trainer.weeklyDays,
                    timesInDay: trainer.timesInDay,
                    fbLink: trainer.fbLink,
                    experience: trainer.experience,
                    photoURL: trainer.photoURL,
                    role: trainer.role,
                    status: "pending"
                },
            };
            const result = await usersCollection.updateOne(filter, applyTrainer, options);
            console.log("Done Trainer applying")
            res.send(result);
            // }
        })

        app.put('/api/v1/trainer/:email', async (req, res) => {
            const queryStatus = req.query.status
            const trainer = req.body;
            // console.log("trainer", trainer)
            const email = req.params.email
            console.log(email)
            const filter = { email: email };
            const options = { upsert: true };
            if (queryStatus === "confirmation") {
                const applyTrainer = {
                    $set: {
                        email: trainer.email,
                        fullName: trainer.fullName,
                        age: trainer.age,
                        description: trainer.description,
                        skills: trainer.skills,
                        // week: trainer.week,
                        // day: trainer.day,
                        weeklyDays: trainer.weeklyDays,
                        timesInDay: trainer.timesInDay,
                        fbLink: trainer.fbLink,
                        experience: trainer.experience,
                        photoURL: trainer.photoURL,
                        role: "trainer",
                        status: queryStatus
                        // status: queryStatus = "confirmation" 

                    },
                };
                const result = await usersCollection.updateOne(filter, applyTrainer, options);
                console.log("Done Trainer rejects")
                res.send(result);
                // res.send({ status: "confirmation", result });
            }
            else if (queryStatus === "reject") {
                const applyTrainer = {
                    $set: {
                        email: trainer.email,
                        fullName: trainer.fullName,
                        age: trainer.age,
                        description: trainer.description,
                        skills: trainer.skills,
                        // week: trainer.week,
                        // day: trainer.day,
                        weeklyDays: trainer.weeklyDays,
                        timesInDay: trainer.timesInDay,
                        fbLink: trainer.fbLink,
                        experience: trainer.experience,
                        photoURL: trainer.photoURL,
                        role: trainer.role,
                        status: queryStatus
                        // status: queryStatus = "reject"

                    },
                };
                const result = await usersCollection.updateOne(filter, applyTrainer, options);
                console.log("Done Trainer confirmation")
                // res.send({ status: "reject", result });
                res.send(result);
            }
            // }
        })

        app.get('/api/v1/trainers', async (req, res) => {
            const queryStatus = req.query.status;
            console.log(queryStatus);
            // const trainers =

            // const confirmation = "confirmation";
            // const query = { status: confirmation };
            const query = { status: queryStatus };
            // const query = { };

            const result = await usersCollection.find(query).toArray();

            res.send(result);
        })

        app.get('/api/v1/trainers/:id', async (req, res) => {
            // const trainers =
            // console.log("req.url" + req.url)
            // const confirmation = "confirmation";
            const id = req.params.id;
            // console.log("req.url" + req.url + req.params.id)
            const query = { _id: new ObjectId(id) };

            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        app.get('/api/v1/dashboard', async (req, res) => {
            const emailQuery = req.query.email

            // console.log(emailQuery)
            const query = { email: emailQuery }
            // console.log(query)

            // const options = {}

            const result = await usersCollection.findOne(query);

            res.send(result)
        })

        app.post('/api/v1/forums', async (req, res) => {
            const forum = req.body;
            console.log(forum)
            const result = await forumsCollection.insertOne(forum)
            res.send(result);
        })

        // get all
        app.get('/api/v1/forums', async (req, res) => {
            const result = await forumsCollection.find().toArray();
            res.send(result);
        })
        app.get('/api/v1/forums/:id', async (req, res) => {
            const id = req.params.id;
            // const {vote} = req.body;

            const filter = { _id: new ObjectId(id) };

            // const updateVote = {
            //     $set: {
            //         vote: vote
            //     },
            // };
            const result = await forumsCollection.findOne(filter);
            res.send(result);
        })
        app.patch('/api/v1/forums/:id', async (req, res) => {
            const id = req.params.id;
            const { vote } = req.body;

            const filter = { _id: new ObjectId(id) };

            const updateVote = {
                $set: {
                    vote: vote
                },
            };
            const result = await forumsCollection.updateOne(filter, updateVote);
            res.send(result);
        })

        app.get('/api/v1/availableClassTimes', async (req, res) => {
            const getEmailQuery = req.query.email;

            const query  = { email: getEmailQuery };
            // console.log(query);

            const result = await usersCollection.findOne(query);

            // console.log(result);

            res.send(result);

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
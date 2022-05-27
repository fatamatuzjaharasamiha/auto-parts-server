const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();
const jwt = require('jsonwebtoken');

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.htbbs.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        res.status(401).send({ message: "Unauthorized access" })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    });
}


async function run() {
    try {
        await client.connect();
        console.log('database connected');
        const productCollection = client.db('auto_parts').collection('products');
        const orderCollection = client.db('auto_parts').collection('orders')
        const userCollection = client.db('auto_parts').collection('users')
        const reviewCollection = client.db('auto_parts').collection('reviews')

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email
             const requesterAccount = await userCollection.findOne({ email: requester })
             if (requesterAccount.role === 'admin') {
                next()
             }
             else {
                 res.status(403).send({ message: "forbidden" })
             }
         }

        // put user to db
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ result, token })
        })

        app.get('/product', async (req, res) => {
            const products = await productCollection.find().toArray()
            res.send(products)
        })

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query)
            res.send(product);
        })



        // put order in orders collection
        app.put('/order', verifyJWT, async (req, res) => {

            const order = req.body
            const filter = {
                email: order.email,
                toolId: order.toolId
            }
            const query = { _id: ObjectId(order.toolId) }
            const options = { upsert: true };
            const exist = await orderCollection.findOne(filter)
            if (exist) {
                const updatedDoc = {
                    $set: {
                        address: order.address,
                        phone: order.phone,
                        quantity: exist.quantity + order.quantity,
                        price: exist.price + order.price
                    }
                }
                const tool = await productCollection.findOne(query)
                const updateTool = {
                    $set: {
                        quantity: tool.quantity - order.quantity
                    }
                }
                const updatedTool = await productCollection.updateOne(query, updateTool, options)
                const updatedOrder = await orderCollection.updateOne(filter, updatedDoc, options)
                return res.send({ updatedOrder, updatedTool })
            }

            else {
                const tool = await productCollection.findOne(query)
                const updateTool = {
                    $set: {
                        quantity: tool.quantity - order.quantity
                    }
                }
                const updatedTool = await productCollection.updateOne(query, updateTool, options)
                const result = await orderCollection.insertOne(order)
                return res.send({ result, updatedTool })
            }
        })

        // user ordered api
        app.get('/userorder', verifyJWT, async (req, res) => {
            const email = req.query.email
            const authorization = req.headers.authorization
            const decodedEmail = req.decoded.email
            if (email === decodedEmail) {
                const query = { email: email }
                const orders = await orderCollection.find(query).toArray()
                return res.send(orders)
            }
            else {
                res.status(403).send({ message: 'forbidden access' })
            }
        })
        // add review
        app.post('/userreview', verifyJWT, async (req, res) => {
            const review = req.body
            console.log(review);
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find().toArray()
            res.send(reviews)
        })

        // update user
        app.put('/updateduser', verifyJWT, async (req, res) => {
            const email = req.query.email
            const updatedUser = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedUser.name,
                    img: updatedUser.img,
                    phone: updatedUser.phone,
                    education: updatedUser.education,
                    address: updatedUser.address,
                    linkedin: updatedUser.linkedin
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        // Load all user
        app.get('/alluser', verifyJWT, async (req, res) => {
            const query = {}
            console.log("Hit")
            const users = await userCollection.find(query).toArray()
            res.send(users)
        })

        // make admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)

        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })
        })

        app.delete('/deleteuser/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })
        app.get('/allorders', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await orderCollection.find().toArray()
            res.send(result)
        })

        app.post('/addproduct', verifyJWT, verifyAdmin, async (req, res) => {
            const tool = req.body
            const result = await productCollection.insertOne(tool)
            res.send(result)
        })
    }
    finally {

    }
}
run().catch(console.dir)




app.get('/', (req, res) => {
    res.send('Running auto parts server')
});
app.listen(port, () => {
    console.log('Auto parts listening on port', port)
})
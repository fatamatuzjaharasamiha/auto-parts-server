const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.htbbs.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        console.log('database connected');
        const productCollection = client.db('auto_parts').collection('products');
        const orderCollection = client.db('auto_parts').collection('orders')

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

        // Put order in order collection

        // put order in orders collection
        app.put('/order', async (req, res) => {
           
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
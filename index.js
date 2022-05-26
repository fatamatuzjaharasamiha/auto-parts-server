const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://car_admin:<password>@cluster0.htbbs.mongodb.net/?retryWrites=true&w=majority";

app.get('/', (req, res) => {
    res.send('Running auto parts server')
});
app.listen(port, () => {
    console.log('Auto parts listening on port', port)
})
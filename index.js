const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json())
require('dotenv').config()

const verifyJWT = (req, res, next) => {
    const authHeaders = req.headers.authorization
    if (!authHeaders) {
        res.status(401).send('unauthorized access')
    }
    const token = authHeaders.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden' })
        }

        req.decoded = decoded;
        next()
    })

}

// heavenlyCapture
// VPZV6QuIUxeob83E

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drtwsrz.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        const userCollection = client.db('heavenlyCapture').collection('users');
        const allServiceCollection = client.db('heavenlyCapture').collection('allServices')

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email }
            const user = await userCollection.findOne(filter);
            if (!user) {
                return res.status(403).send({ accessToken: 'Not found' })
            }
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1 days' });
            res.send({ accessToken: token })
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const isOldUser = await userCollection.findOne(filter);
            if (!isOldUser) {
                const result = await userCollection.insertOne(user);
                return res.send(result)
            }
            res.send({ oldUser: true })
        })

        app.get('/services', async (req, res) => {
            const category = req.query.category;
            const query = { serviceName: category };
            const result = await allServiceCollection.find(query).toArray();
            res.send(result);
        })
    }
    catch { }

}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('this heavenly capture server is running')
})
app.listen(port, () => {
    console.log(`the server is running on port ${port}`);
})
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const http = require('http')
const socketIO = require("socket.io");

const users = [{}]

app.use(cors());
app.use(express.json())
require('dotenv').config()

const httpServer = http.createServer(app)
const io = socketIO(httpServer)

io.on("connection", (socket) => {
    socket.on('newUser', (data) => {
        users[socket.id] = data
        // console.log(data, 'has joined');
        socket.emit('welcome', { user: 'admin', message: 'welcome to the chat' })
        socket.broadcast.emit('userJoined', { user: 'Admin', message: `${users[socket.id]} has joined` })
    })

    socket.on('message', ({ message, id }) => {
        io.emit('sendMessage', { user: users[id], message, id })
    })

    socket.on("disconnect", () => {
        console.log('user left');
        socket.broadcast.emit('leave', { user: 'Admin', message: `${users[socket.id]} has been left` })
    });

})

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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drtwsrz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        const userCollection = client.db('heavenlyCapture').collection('users');
        const allServiceCollection = client.db('heavenlyCapture').collection('allServices');
        const reviewCollection = client.db('heavenlyCapture').collection('reviews');
        const bookingCollection = client.db('heavenlyCapture').collection('bookings')

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
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await allServiceCollection.findOne(query);
            res.send(result)
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { serviceId: id };
            const reviews = await reviewCollection.find(filter).toArray();
            res.send(reviews)
        })
        app.delete('/review/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await reviewCollection.deleteOne(query)
            res.send(result)
        })
        app.put('/review/:id', async (req, res) => {
            const id = req.params.id;
            const updateReview = req.body;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    feedback: updateReview.feedback
                }
            }
            const result = await reviewCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.get('/userType', async (req, res) => {
            const userEmail = req.query.email;
            const filter = { email: userEmail }
            const user = await userCollection.findOne(filter)
            res.send({ userType: user.userType })
        })

        app.post('/booking', verifyJWT, async (req, res) => {
            const bookingInfo = req.body;
            const email = bookingInfo.buyerEmail;
            const query = { buyerEmail: email };
            const allBookings = await bookingCollection.find(query).toArray();
            const isBooked = allBookings.find(booking => booking.bookedProductId === bookingInfo.bookedProductId);

            if (isBooked) {
                return res.send({ message: 'alreay booked' })
            }
            const result = await bookingCollection.insertOne(bookingInfo);
            res.send(result)
        })
        app.delete('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result)
        })
        app.get('/mybooking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            const query = { buyerEmail: email }
            if (email === decodedEmail) {
                const result = await bookingCollection.find(query).toArray()
                return res.send(result)
            }
            res.status(403).send('forbidden access')
        })

    }
    catch { }

}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('this heavenly capture server is running')
})
httpServer.listen(port, () => {
    console.log(`the server is running on port ${port}`);
})
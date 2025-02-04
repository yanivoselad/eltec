var express = require('express')
var bodyParser = require('body-parser')
var app = express()
var http = require('http')
var server = http.createServer(app)
const {Server} = require('socket.io')
const io = new Server(server)
const mongoose = require('mongoose');
const { sendStatus } = require('express/lib/response')
//var sassMiddleware = require('node-sass-middleware');
const fs = require('fs');
const csv = require('csv-parser');
const _ = require('lodash');
require('dotenv').config();
mongoose.set('strictQuery', false);

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))


app.use(express.static(__dirname+'/public'))
  
var dbUrl = process.env.DB_URL

var Message = mongoose.model( 'Message', {
    name : String,
    message: String
})

var productSchema = new mongoose.Schema({
    company: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: false
    },
    subcode: {
        type: String,
        required: false
    },
    amount: {
        type: Number,
        required: false,
        default:0
    },
    description: {
        type: String,
        required: false
    },
    price: {
        type: String,
        required: false
    }
})

//pt3FgJMOE4vf6zAB


var connections = [];

// Function to read CSV and convert to JSON
function csvToJson(filePath) {
    console.log(filePath)
    return new Promise((resolve, reject) => {
        const results = [];

        // Read the CSV file
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))  // Push each row to results array
            .on('end', () => {
                // Resolve the promise with the results
                resolve(results);
            })
            .on('error', (err) => {
                // Reject the promise if an error occurs
                reject("Error reading CSV file: " + err);
            });
    });
}

app.post('/admin/upload', async (req, res) => {
    console.log(req.body)
    const Product = mongoose.model('Product', productSchema);
    await Product.deleteMany({
        company: req.body.module
    });
    console.log('clearing data for ' + req.body.module)
    const products = await csvToJson('data/' + req.body.name);
    console.log(products)
    console.log(products.length)
    await Product.insertMany(products)
    res.sendStatus(200)
})

app.get('/products', (req, res) => {
    const Product = mongoose.model('Product', productSchema);
    Product.find({}, (err, products) => {        
        res.status(200).send({
            companies: _.keys(_.keyBy(products, 'company')),
            products: products,
        })
    })
})

app.get('/users',(req,res) => {
    res.send()
})

app.post('/messages',(req,res) => {
    var message = new Message(req.body)
    message.save((err) => {
    if(err)
        sendStatus(500)
    
    io.emit('message',req.body)
    res.sendStatus(200)
    })
})

io.on('connection',(socket) => {
    if(!connections.includes(socket.id)){
        connections.push(socket.id)
    }
    console.log('a user connected'+ connections.length)
})

mongoose.connect(dbUrl,(err) => {
    console.log('mongoose DB connection ' + err)
})

server.listen(3000,() => {
    console.log('server is listening at port:'+ server.address().port)
})
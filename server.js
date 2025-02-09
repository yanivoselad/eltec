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
const path = require('path');
const cors = require('cors');

app.use(cors({
    origin: 'https://master.d214kkf92dbtt3.amplifyapp.com',
    methods: ['GET', 'POST'], // You can specify which methods are allowed
}));

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
        //default:"ALLIED"
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
    },
    category: {
        type: String,
        required: false
    },
    subcategory: {
        type: String,
        required: false
    },
    izo: {
        type: String,
        required: false
    },
    grade: {
        type: String,
        required: false
    },
    currency: {
        type: String,
        required: false
    },
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

app.post('/api/admin/upload', async (req, res) => {
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

app.get('/getProducts', (req, res) => {
    const Product = mongoose.model('Product', productSchema);
    Product.find({}, (err, _products) => {
        let products = [..._products]
        products = products.map(prod => {
            let product = prod  
            product.category= !prod.category ? "other" : prod.category
            product.subcategory = !prod.subcategory ? "other" : prod.subcategory            
            return product
        })

        let categories = _.groupBy(products, 'category')
       
        let categoriesSum = []
        _.keys(categories).forEach((category) => {
            let subcategories = _.groupBy(categories[category], 'subcategory')
            let categorybycompany = _.groupBy(categories[category], 'company')
            console.log(_.keys(categorybycompany))
            let categoryMapping = {}
            _.keys(categorybycompany).forEach((company) => {
                categoryMapping[company] = categorybycompany[company].length
            })
            categoriesSum.push({
                name: category,
                amount: { total: categories[category].length, companies : categoryMapping },
                companies: _.keys(categorybycompany),
                subcategories: _.keys(subcategories),
            })
        })
        
        res.status(200).send({
            companies: _.keys(_.keyBy(products, 'company')),
            products: products,
            categories: categoriesSum
        })
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

server.listen(4000,() => {
    console.log('server is listening at port:'+ server.address().port)
})
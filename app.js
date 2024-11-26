const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const { default: mongoose, mongo } = require('mongoose');
const dotenv = require('dotenv');
const { createServer } = require('@vercel/node');
const serverless = require('serverless-http');


// router link
const itemRoutes = require('./api/routes/items');
const userRoutes = require('./api/routes/users');

mongoose.connect('mongodb+srv://inventory:management@cluster0.pfrrn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
mongoose.Promise = global.Promise;

app.use(morgan('dev'));
app.use('/uploads', express.static('uploads')); // make the uploads folder accessible
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

// routes
app.use('/items', itemRoutes);
app.use('/users', userRoutes);



app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
})

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
})


module.exports = app;
module.exports.handler = serverless(app);
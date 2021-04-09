require("dotenv").config()
const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors")
const Knex = require('knex');
const { Model } = require('objection');
const knexConfig = require('./knexfile');
const homeRoute = require('./routes/homeRoute');
const requiredLogin = require("./middlewares/requiredLogin");
const userRoute = require("./routes/userRoute");
const webhookRoute = require("./routes/webhookRoute");

// Initialize knex.
const knex = process.env.NODE_ENV === "development" ? Knex(knexConfig.development) : 
    process.env.NODE_ENV === "staging" ? Knex(knexConfig.staging) : 
    process.env.NODE_ENV === "production" && Knex(knexConfig.production)  ; //added prodcution incase of mispelling, wont mess up production DB

// Bind all Models to the knex instance. You only
// need to do this once before you use any of
// your model classes.
Model.knex(knex);

var app = express();

const corsOpts = {
    origin: '*',

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE'
    ],
    allowedHeadders: [
        'Content-Type',
    ]
}
app.use(cors(corsOpts));

app.use(express.json({ limit: '1mb' }));

//app.use(bodyParser.json());

const PORT = process.env.PORT;

app.use('/api/auth', homeRoute);

app.use('/api/user',requiredLogin, userRoute)


//in real world situation, IP address filter comes here
app.use('/api/webhook', webhookRoute)

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`)
})
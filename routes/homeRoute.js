require("dotenv").config();
const express = require("express");
const Joi = require("joi");
const { verifyUniqueUser } = require("../helpers/signupHelper")
const bcrypt = require("bcrypt");
const redis = require("redis");
const util = require("util");
const jwt = require('jsonwebtoken');
const { transaction } = require("objection");


const { User } = require("../models/User");
const Account = require("../models/Account")

const router = express.Router();

//setting up redis
const REDIS_URL = process.env.REDIS_URL;
const client = redis.createClient(REDIS_URL);
client.hget = util.promisify(client.hget);
client.hset = util.promisify(client.hset);
client.hdel = util.promisify(client.hdel)

const JWT_SECRET = process.env.JWT_SECRET


const saltRounds = 10;

router.post('/signup', async (req, res) => {
    try {

        let signupSchema = Joi.object({
            fullname: Joi.string().trim().lowercase().min(3).max(30).required().messages({
                'string.base': `firstname should be a type of 'text'`,
                'string.empty': `firstname cannot be empty`,
                'string.min': `firstname should have a minimum length of {#limit}`,
                'any.required': `firstname is required`
            }),
            username: Joi.string().trim().lowercase().min(3).max(20).required(),
            email: Joi.string().trim().email({ minDomainSegments: 2 }).required(),
            mobile: Joi.string().length(11).pattern(new RegExp(/^\d+$/)).required(),
            password: Joi.string().min(8).pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required()
        })

        //not using async because catch block will catch error and cannot distinguish between validation error and server error.
        let { value, error } = signupSchema.validate(req.body, { abortEarly: false });

        //handling errors
        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({ errors: errors });
        }

        //check for uniqueness
        let isUserUnique = await verifyUniqueUser(value);
        if (typeof isUserUnique !== "undefined") {
            return res.status(400).send({ errors: [isUserUnique] })
        }
        //hashing passord
        let passwordHash = await bcrypt.hash(value.password, saltRounds);
        value.password = passwordHash;

        //DB transaction
        let userCreation = await transaction(User, Account, async(User, Account)=>{
            //create new user
            let newUser = await User.query().insert(value);

            //create user account
            await Account.query().insert({
                user: newUser.id,
                balance: 0,
                created_at: new Date(),
                updated_at: new Date()
            })

            return newUser;
        })

        delete userCreation.password;

        //returning the user just for visualization sake
        res.status(201).send({ user: userCreation })

    } catch (error) {
        console.log(error.message)
        res.status(500).send({ errors: ["Something went wrong"] });
    }
});


router.post('/signin', async (req, res) => {
    try {
        const loginSchema = Joi.object({
            mobile: Joi.string().length(11).pattern(new RegExp(/^\d+$/)).required(),
            password: Joi.string().trim().required()
        });

        let { value, error } = loginSchema.validate(req.body);

        //handling errors
        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({ errors: errors });
        }

        let { mobile, password } = value;
        //get user
        let user = await User.query().findOne('mobile', '=', mobile);

        if (typeof user === "undefined") {
            return res.status(400).send({ errors: ["user does not exist"] });
        }

        //compare password
        let comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
            return res.status(400).send({ errors: ["wrong mobile number and password combination"] });
        }

        let data = {
            mobile: user.mobile,
            email: user.email,
            id: user.id
        }
        //generate token
        let token = jwt.sign({
            data: data
        }, JWT_SECRET);

        //check for cached tokens and delete
        let loginToken = await client.hget('abeglogintokens', user.id.toString());
        if (loginToken !== null) {
            await client.hdel("abeglogintokens", user.id.toString())
        }

        //cache login tokens so server can verify if tokens are still in use in the system
        await client.hset("abeglogintokens", user.id.toString(), token);

        delete user.password

        res.status(200).send({ token: token, user: user });

    } catch (error) {
        res.status(500).send("Something went wrong")
    }

})

// router.get('/check-ip',(req,res)=>{
//     const ip = req.ip;
//   const port = req.socket.localPort;
//   console.log(`Your IP address is ${ip} and your source port is ${port}.`);
//   res.send("OK")
// })

module.exports = router;

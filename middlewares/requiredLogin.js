require("dotenv").config();
const jwt = require("jsonwebtoken");
const redis = require("redis");
const util = require("util");


//setting up redis
const REDIS_URL = process.env.REDIS_URL;
const client = redis.createClient(REDIS_URL);
client.hget = util.promisify(client.hget);
client.hset = util.promisify(client.hset);
client.hdel = util.promisify(client.hdel)

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * This function validates the auth token
 * checks redis cache to know if the token is valid
 * @param {string} token 
 */
const validateToken=async(token, req)=>{
    try {
        //get data from token
        let {data} = jwt.decode(token);

        //check if token is in cache
        let loginToken = await client.hget("abeglogintokens",data.id);

        if(loginToken === null){
            return false;
        }

        //check if token corresponds
        if(loginToken !== token){
            return false;
        }

        //verify if token was signed by server
        let ourToken = jwt.verify(token, JWT_SECRET);

        if(!ourToken)
            return false;

        req.user = data.id;
        req.email = data.email;
        return true;

    } catch (error) {
        console.log(error.message)
    }
}


const requiredLogin=(req,res,next)=>{
    try {
        //console.log(req.connection.remoteAddress)

        const bearerHeader = req.headers['authorization'];
        if(typeof bearerHeader !== 'undefined'){
            let bearer = bearerHeader.split(" ");
            let bearerToken = bearer[1];
            req.token = bearerToken;

            validateToken(bearerToken, req).then((value)=>{
                if(value){
                    next();
                }else{
                    res.status(401).send({errors: ["unauthorized user"]});
                }
            }).catch(error=>{
                console.log(error)
                res.status(500).send({errors: ["authorization error"]});
            })
            
            
        }else{
            res.status(401).send({errors: ["unauthorized user"]});
        }

    } catch (error) {
        console.log(error.message);
        res.status(500).send({errors: ["authorization error"]});
    }
}

module.exports = requiredLogin;
const express = require("express");
const crypto = require("crypto");
const {completeWithdrawal} = require("../helpers/transactionHelper");
const Withdraw = require("../models/Withdraw");


const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

const router = express.Router();


router.post('/paystack_confirm_transfer', async (req, res) => {
    console.log("click")
    //validate event
    var hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');

    //check if has correlates
    if (hash == req.headers['x-paystack-signature']) {

        // Retrieve the request's body

        var data = req.body;

        //get user by reference from withdraw table
        let withdaw = await Withdraw.query().findOne('external_reference','=', data.data.reference);

        if(typeof withdaw !== "undefined"){ 
            let complete = await completeWithdrawal({amount: data.data.amount,user_id: withdaw.user, ext_reference: data.data.reference, outcome: data.event })
            console.log(complete)
            if(complete.success){
                return res.status(200).send();
            }else{
                return res.status(400).send();
            }
        }

    }


    res.status(400).send();
})


module.exports = router
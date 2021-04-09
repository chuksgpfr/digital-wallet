require("dotenv").config();
const express = require("express");
const Joi = require("joi");
const { chargeCard, checkChargeContinuation, sendPin, sendOtp, sendPhone } = require("../services/card");
const { creditAccount, completeTransaction, internalTransfer, withdrawal } = require("../helpers/transactionHelper");


const CardTransaction = require("../models/CardTransaction");
const { User } = require("../models/User");
const { verifyAccountNumber, createTransferRecipent, initiateTransfer } = require("../services/withdraw");
const Withdraw = require("../models/Withdraw");
const Account = require("../models/Account");


const router = express.Router();


router.post('/fund-account-bank-card',async(req,res)=>{
    //note that amount is converted to kobo (paystack requirement) 
    try {
        const fundSchema = Joi.object({
            pan: Joi.string().pattern(new RegExp(/^\d+$/)).required(),
            expiry_month: Joi.string().min(2).max(2).pattern(new RegExp(/^\d+$/)).required(),
            expiry_year:Joi.string().min(2).max(2).pattern(new RegExp(/^\d+$/)).required(),
            cvv: Joi.string().min(3).max(3).pattern(new RegExp(/^\d+$/)).required(),
            amount: Joi.number().min(3).required()
        })

        let { value, error } = fundSchema.validate(req.body, { abortEarly: false });

        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({ errors: errors });
        }

        let card = {
            id: req.user,
            pan: value.pan,
            expiry_month: value.expiry_month,
            expiry_year: value.expiry_year,
            cvv: value.cvv,
            email: req.email,
            amount: value.amount * 100 //paystack requires amount should be in kobo
        }
        let charge = await chargeCard(card);

        let nextStep = checkChargeContinuation(charge);

        //create a new card transaction in DB
        let cardTrans = await CardTransaction.query().insert({
            user: req.user,
            external_reference: nextStep.data.reference,
            amount: value.amount,
            latest_response: nextStep.message,
            created_at: new Date(),
            updated_at: new Date()
        })

        //check if server should credit account (when otp or other verification is not required)

        if(nextStep.data.creditAccount){
            let credited = await creditAccount({
                amount:value.amount,
                user_id:req.user,
                purpose:"deposit",
                ext_reference: nextStep.data.reference
            })

            //queue send email and notification (but no queue implemented)

            return res.status(200).send(credited);
        }
        
        res.status(200).send({success: true, message: nextStep.message, ext_reference: nextStep.data.reference, reason: nextStep.data.message })

    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
})

router.post('/send_pin',async(req, res)=>{
    try {
        const pinSchema = Joi.object({
            pin: Joi.string().min(4).max(4).pattern(new RegExp(/^\d+$/)).required(),
            external_reference: Joi.string().required()
        })

        let {value, error} = pinSchema.validate(req.body, { abortEarly: false });

        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({ errors: errors });
        }

        //get card transaction 
        let cardTrans = await CardTransaction.query().findOne('external_reference','=',value.external_reference).andWhere('user','=',req.user);

        if(typeof cardTrans === "undefined"){
            return res.status(200).send({success: false,errors:["Transaction does not exist"]})
        }

        if(cardTrans.latest_response === "success"){
            return res.status(200).send({success: false,errors:["Transaction already successful"]})
        }

        let {user, amount} = cardTrans;

        let {data} = await sendPin({ext_reference: value.external_reference, pin: value.pin});
        
        let completer = await completeTransaction({user_id:user, ext_reference: value.external_reference, amount, status: data.status, reason: data.message });

        res.status(200).send(completer);

    } catch (error) {
        console.log(error.response);
        res.status(500).send({success:false, errors:["Something went wrong"]})
    }
})


router.post('/send_otp',async(req,res)=>{
    try {
        const otpSchema = Joi.object({
            otp: Joi.string().min(4).max(6).pattern(new RegExp(/^\d+$/)).required(),
            external_reference: Joi.string().required()
        })

        let {value, error} = otpSchema.validate(req.body, { abortEarly: false });

        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({ errors: errors });
        }

        //get card transaction 
        let cardTrans = await CardTransaction.query().findOne('external_reference','=',value.external_reference).andWhere('user','=',req.user);

        if(typeof cardTrans === "undefined"){
            return res.status(200).send({success: false,errors:["Transaction does not exist"]})
        }

        if(cardTrans.latest_response === "success"){
            return res.status(200).send({success: false,errors:["Transaction already successful"]})
        }

        let {user, amount} = cardTrans;

        let {data} = await sendOtp({ext_reference: value.external_reference, otp: value.otp});

        let completer = await completeTransaction({user_id:user, ext_reference: value.external_reference, amount, status: data.status });

        res.status(200).send(completer);

    } catch (error) {
        console.log(error);
        res.status(500).send({success:false, errors:["Something went wrong"]})
    }
})

router.post('/send_phone',async(req,res)=>{
    try {
        const phoneSchema = Joi.object({
            phone: Joi.string().min(11).max(11).pattern(new RegExp(/^\d+$/)).required(),
            external_reference: Joi.string().required()
        })

        let {value, error} = phoneSchema.validate(req.body, { abortEarly: false });

        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({ errors: errors });
        }

        //get card transaction 
        let cardTrans = await CardTransaction.query().findOne('external_reference','=',value.external_reference).andWhere('user','=',req.user);

        if(typeof cardTrans === "undefined"){
            return res.status(200).send({success: false,errors:["Transaction does not exist"]})
        }

        if(cardTrans.latest_response === "success"){
            return res.status(200).send({success: false,errors:["Transaction already successful"]})
        }

        let {user, amount} = cardTrans;

        let {data} = await sendPhone({ext_reference: value.external_reference, phone: value.phone});

        let completer = await completeTransaction({user_id:user, ext_reference: value.external_reference, amount, status: data.status });

        res.status(200).send(completer);

    } catch (error) {
        console.log(error);
        res.status(500).send({success:false, errors:["Something went wrong"]})
    }
})


router.post('/internal_transfer',async(req,res)=>{
    try {
        let bodySchema = Joi.object({
            username: Joi.string().required(),
            amount: Joi.number().min(1).required()
        })

        let {value, error} = bodySchema.validate(req.body, {abortEarly: false})
        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({success:false, errors: errors });
        }

        //get sender
        let sender = await User.query().findOne('id','=',req.user);

        if(typeof sender === "undefined"){
            return res.status(400).send({success:false, errors: ["Who are you ?"] });
        }

        //get receiver
        let receiver = await User.query().findOne('username','=',value.username);

        if(typeof receiver === "undefined"){
            return res.status(400).send({success:false, errors: ["Sender does not exist"] });
        }

        let transfer = await internalTransfer({amount: value.amount, sender_id: sender.id, receiver_id:receiver.id})

        res.status(200).send(transfer)


    } catch (error) {
        console.log(error.response);
        res.status(200).send({success:false, errors:["Something went wrong"]})
    }
})

router.post('/withdraw',async(req, res)=>{
    try {

        let withdrawSchema = Joi.object({
            amount: Joi.number().min(1).required(),
            account: Joi.string().min(10).pattern(new RegExp(/^\d+$/)).required(),
            code: Joi.string().min(3).max(3).pattern(new RegExp(/^\d+$/)).required()
        })

        let {value, error} = withdrawSchema.validate(req.body);
        if (error) {
            let errors = error.message.split('.');
            return res.status(400).send({success:false, errors: errors });
        }

        let user = await User.query().findOne('id','=',req.user);

        if(typeof user === "undefined"){
            return res.status(400).send({success:false, errors:["User does not exist"]});
        }

        let account = await Account.query().findOne('user','=',req.user);
        if(typeof account === "undefined"){
            return res.status(400).send({success:false, errors:["Account does not exist"]});
        }

        if(account.balance < value.amount){
            return res.status(400).send({success:false, errors:["Insufficient fund "]});
        }

        //verify account number
        let data = await verifyAccountNumber({number: value.account, code: value.code});

        if(!data.status){
            return res.status(200).send({success:false, errors:[data.message]});
        }

        //Create a transfer recipient
        let createTransfer = await createTransferRecipent({name: data.data.account_name, account_number: data.data.account_number, bank_code: value.code});
        if(!createTransfer.status){
            return res.status(200).send({success:false, errors:[createTransfer.message]});
        }

        //initiate transfer
        let initTransfer = await initiateTransfer({amount: value.amount, recipient: createTransfer.data.recipient_code })
        if(!initTransfer.status){
            return res.status(200).send({success:false, errors:[initTransfer.message]});
        }

        let withdraw = await withdrawal({amount: value.amount, user_id:req.user, ext_reference: initTransfer.data.reference})
        if(!withdraw){
            return res.status(200).send({success:false, message: ["Transaction failed to store in DB"]})
        }

        res.status(200).send({success:true, message: initTransfer.message})

    } catch (error) {
        console.log(error.message)
        res.status(500).send({success:false, errors: ["Something went wrong"]})
    }
})

module.exports = router;
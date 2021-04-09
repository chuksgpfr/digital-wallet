const axios = require("axios");

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

const paystackServer = () => axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
    }
})

/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {string} body.pan - the 16 digit card number
 * @param {string} body.expiry_month - card expiry month
 * @param {string} body.expiry_year - card expiry year
 * @param {string} body.cvv - card cvv
 * @param {string} body.email - user email
 * @param {string} body.email - amount to charge card
 * @returns 
 */
const chargeCard = async ({ pan, expiry_month, expiry_year, cvv, email, amount }) => {
    try {
        let body = {
            email,
            amount,
            card: {
                number: pan,
                cvv,
                expiry_year,
                expiry_month,
            }
    
        }
        let { data } = await paystackServer().post('/charge', body);
        return data;
    } catch (error) {
        //console.log(error.response.data)
        return error.response.data
        //return "failed"
    }
}


/**
 * 
 * @param {Object} chargeResult 
 * @returns 
 */
const checkChargeContinuation = (chargeResult) => {
    let { data } = chargeResult;
    if (data.status === "success") {
        return {
            success: true,
            message: data.status,
            data: {
                creditAccount: true,
                reference: data.reference,
                message: data.message
            },
        }
    }else{
        return {
            success: true,
            message: data.status,
            data: {
              creditAccount: false,
              reference: data.reference,
              message: data.message
            },
          };
    }
}

/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {string} body.ext_reference - paystack external reference
 * @param {string} body.pin - card pin
 * @returns 
 */
const sendPin=async({ext_reference, pin})=>{
    try {
        let body = {reference: ext_reference, pin}

        let {data} = await paystackServer().post('/charge/submit_pin',body);
        
        return data;
    } catch (error) {
        //console.log(error.response.data)
        return error.response.data
    }
}

/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {string} body.ext_reference - paystack external reference
 * @param {string} body.otp - otp received
 * @returns 
 */
const sendOtp=async({ext_reference, otp})=>{
    try {
        let body = {reference: ext_reference, otp}

        let {data} = await paystackServer().post('/charge/submit_otp',body);
        
        return data;
    } catch (error) {
        return error.response.data
    }
}

/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {string} body.ext_reference - paystack external reference
 * @param {string} body.pin - phone number
 * @returns 
 */
const sendPhone=async({ext_reference, phone})=>{
    try {
        let body = {reference: ext_reference, phone}
        
        let {data} = await paystackServer().post('/charge/submit_phone',body);
        
        return data;
    } catch (error) {
        return error.response.data
    }
}



module.exports = { chargeCard, checkChargeContinuation, sendPin, sendOtp, sendPhone }
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
 * @param {string} body.number - account number
 * @param {string} body.code - bank code
 * @returns 
 */
const verifyAccountNumber=async({number, code})=>{
    try {
        let {data} = await paystackServer().get(`/bank/resolve?account_number=${number}&bank_code=${code}`);
        return data;
    } catch (error) {
        //console.log(error.response.data)
        return error.response.data
    }
}


/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {string} body.name - user full name, gotten from paystack
 * @param {string} body.account_number - user account number
 * @param {string} body.bank_code - user bank code
 * @param {string} body.currency - user currency (NGN or GHC)
 * @returns 
 */
const createTransferRecipent=async({name, account_number, bank_code, currency="NGN"})=>{
    try {
        let body = {
            type: "nuban",
            name,
            account_number,
            bank_code,
            currency
        }
    
        let {data} = await paystackServer().post('/transferrecipient', body);
    
        return data;
    } catch (error) {
        return error.response.data;
    }
}


/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {string} body.amount - user full name, gotten from paystack
 * @param {string} body.recipient - receipent code received from paystack
 * @returns 
 */
const initiateTransfer=async({amount, recipient})=>{
    try {
        let body = {
            source: "balance",
            amount: amount*100, //paystack requires amount to be in kobo
            recipient,
            reason:"Abeg App withdrawal"
        }
    
        let {data} = await paystackServer().post('/transfer', body);
    
        return data;
    } catch (error) {
        return error.response.data;
    }
}



module.exports = {verifyAccountNumber, createTransferRecipent, initiateTransfer}

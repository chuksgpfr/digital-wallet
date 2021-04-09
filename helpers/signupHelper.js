const {User} = require("../models/User");



/**
 * This function validates the uniqueness of the params in the DB
 * @param {Object} user - The user you want to verify
 * @param {string} user.username - The user's username
 * @param {string} user.email - The user's email
 * @param {mobile} user.mobile - The user's mobile number
 * returns undefined if all is unique
 */
const verifyUniqueUser=async({username, mobile, email})=>{
    //check if username exists
    let usernameExist = await User.query().findOne('username','=',username);

    if(typeof usernameExist !== "undefined")
        return "username already exists"

    let emailExist = await User.query().findOne('email','=',email);
    if(typeof emailExist !== "undefined")
        return "email already exists"

    let mobileExist = await User.query().findOne('mobile','=',mobile);
    if(typeof mobileExist !== "undefined")
        return "mobile number already exists"

    return;
}


module.exports = {verifyUniqueUser}
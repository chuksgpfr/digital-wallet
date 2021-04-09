const { transaction } = require('objection');
const { v4 } = require('uuid');

const Account = require("../models/Account");
const CardTransaction = require('../models/CardTransaction');
const Transaction = require("../models/Transaction");
const Withdraw = require('../models/Withdraw');


/**
 * This function validates the uniqueness of the params in the DB
 * @param {Object} body - the credit body
 * @param {number} body.amount - amount
 * @param {number} body.user_id - The user's id
 * @param {string} body.purpose - The purpose of crediting
 * @param {string} body.ext_reference - the reference from paystack
 */
const creditAccount = async ({ amount, user_id, purpose, ext_reference }) => {
    try {
        //check if user has an account
        let userAccount = await Account.query().findOne('user', '=', user_id);

        if (typeof userAccount === "undefined") {
            return {
                success: false,
                errors: ['Account does not exist'],
            }
        }

        try {
            //database transaction
            let crediter = await transaction(Account, Transaction, async (Account, Transaction) => {
                //increment balance to eliminate race condition
                await Account.query().increment('balance', Number(amount)).where('user', '=', user_id);

                //create transaction
                await Transaction.query().insert({
                    user: user_id,
                    transaction_type: "credit",
                    purpose,
                    amount: Number(amount),
                    old_balance: Number(userAccount.balance),
                    new_balance: Number(userAccount.balance) + Number(amount),
                    reference: v4(),
                    ext_reference: ext_reference,
                    created_at: new Date(),
                    updated_at: new Date()
                })


                return {
                    success: true,
                    message: 'Credit successful',
                    ext_reference
                };

            })

            return crediter;

        } catch (err) {
            console.log(err)
            return {
                success: false,
                errors: ['Credit failed'],
                ext_reference
            }
        }

    } catch (error) {
        console.log(error)
        return {
            success: false,
            errors: ['Credit failed'],
            ext_reference
        }
    }
}

/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {number} body.user_id - The user's id
 * @param {number} body.amount - The amount
 * @param {string} body.ext_reference - the reference from paystack
 * @param {string} body.status - the status of payment
 * @param {string} body.reason - the message inside data body returned by paystack
 * @returns 
 */
const completeTransaction = async ({ user_id, ext_reference, amount, status, reason = null }) => {
    try {

        //check if user has an account
        let userAccount = await Account.query().findOne('user', '=', user_id);

        if (typeof userAccount === "undefined") {
            return {
                success: false,
                errors: ['Account does not exist'],
            }
        }

        let completer = await transaction(CardTransaction, async (CardTransaction) => {
            await CardTransaction.query().findOne('external_reference', '=', ext_reference).patch({ latest_response: status });

            if (status === "success") {
                let credit = await creditAccount({ amount, user_id, purpose: "deposit", ext_reference });
                return credit;
            }

            return {
                success: true,
                message: status,
                ext_reference,
                reason
            };

        })

        return completer;

    } catch (error) {
        console.log(error)
        return {
            success: false,
            errors: ['Credit failed'],
            ext_reference
        }
    }
}


/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {number} body.sender_id - The sender
 * @param {number} body.amount - The amount
 * @param {number} body.receiver_id - the receiver
 * @returns 
 */
const internalTransfer = async ({ amount, sender_id, receiver_id }) => {
    try {
        //check if sender has an account and enough funds
        let senderAccount = await Account.query().findOne('user', '=', sender_id);

        if (typeof senderAccount === "undefined") {
            return {
                success: false,
                errors: ["You don't have an account"],
            }
        }

        if (senderAccount.balance < amount) {
            return {
                success: false,
                errors: ["Insufficient funds fam"],
            }
        }

        //check if receiver has an account and enough funds
        let receiverAccount = await Account.query().findOne('user', '=', receiver_id);

        if (typeof receiverAccount === "undefined") {
            return {
                success: false,
                errors: ['Receiver does not have an account'],
            }
        }

        try {
            //database transaction
            let transfer = await transaction(Account, Transaction, async (Account, Transaction) => {
                //decrement sender blance
                await Account.query().decrement('balance', Number(amount)).where('user', '=', sender_id);

                //increment receiver blance
                await Account.query().increment('balance', Number(amount)).where('user', '=', receiver_id);

                //create sender transaction
                await Transaction.query().insert({
                    user: sender_id,
                    transaction_type: "debit",
                    purpose: "transfer",
                    amount: Number(amount),
                    old_balance: Number(senderAccount.balance),
                    new_balance: Number(senderAccount.balance) - Number(amount),
                    reference: v4(),
                    ext_reference: "internal",
                    created_at: new Date(),
                    updated_at: new Date()
                })

                //create receiver transaction
                await Transaction.query().insert({
                    user: receiver_id,
                    transaction_type: "credit",
                    purpose: "transfer",
                    amount: Number(amount),
                    old_balance: Number(receiverAccount.balance),
                    new_balance: Number(receiverAccount.balance) + Number(amount),
                    reference: v4(),
                    ext_reference: "internal",
                    created_at: new Date(),
                    updated_at: new Date()
                })


                return {
                    success: true,
                    message: 'Credit successful'
                };

            })

            return transfer;

        } catch (err) {
            console.log(err)
            return {
                success: false,
                errors: ['Transfer failed']
            }
        }

    } catch (error) {
        console.log(error)
        return {
            success: false,
            errors: ['Transfer failed']
        }
    }
}


/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {number} body.user_id - The user's id
 * @param {number} body.amount - The amount
 * @param {string} body.ext_reference - the reference from paystack
 * @returns 
 */
const withdrawal = async ({ amount, user_id, ext_reference }) => {
    try {
        let withdraw = await transaction(Withdraw, Account, async (Withdraw, Account) => {
            //decrement balance to eliminate race condition
            await Account.query().decrement('balance', Number(amount)).where('user', '=', user_id);

            //create withdrawal transaction
            await Withdraw.query().insert({
                user: user_id,
                external_reference: ext_reference,
                amount: Number(amount),
                latest_response: "processing",
                created_at: new Date(),
                updated_at: new Date()
            });

        })

        return {
            success: true,
        }
    } catch (error) {
        console.log(error.message)
        return {
            success: false,
        }
    }
}


/**
 * 
 * @param {Object} body - The body to complete transaction
 * @param {number} body.user_id - The user's id
 * @param {number} body.amount - The amount
 * @param {string} body.ext_reference - the reference from paystack
 * @param {string} body.outcome - the outcome, transfer successfulor failed
 * @returns 
 */
const completeWithdrawal = async ({ amount, user_id, ext_reference, outcome }) => {
    try {
        //check if user has an account
        let userAccount = await Account.query().findOne('user', '=', user_id);

        if (typeof userAccount === "undefined") {
            return {
                success: false,
                errors: ['Account does not exist'],
            }
        }

        try {
            //database transaction
            let withdraw = await transaction(Withdraw, Transaction, async (Withdraw, Transaction) => {

                if (outcome === "transfer.success") {
                    //update withdraw table
                    await Withdraw.query().findOne('user', '=', user_id).patch({ latest_response: "success", updated_at: new Date() });

                    //create transaction
                    await Transaction.query().insert({
                        user: user_id,
                        transaction_type: "debit",
                        purpose: "withdrawal",
                        amount: Number(amount),
                        old_balance: Number(userAccount.balance),
                        new_balance: Number(userAccount.balance) - Number(amount),
                        reference: v4(),
                        ext_reference: ext_reference,
                        created_at: new Date(),
                        updated_at: new Date()
                    })


                    return {
                        success: true,
                        message: 'Update successful',
                        ext_reference
                    };
                }
                if(outcome === "transfer.reversed"){
                    //increment balance to eliminate race condition
                    await Account.query().increment('balance', Number(amount)).where('user', '=', user_id);

                    //update withdraw table
                    await Withdraw.query().findOne('user', '=', user_id).patch({ latest_response: "reversed", updated_at: new Date() });

                    return {
                        success: true,
                        message: 'Update reversed',
                        ext_reference
                    };
                }

            })

            return withdraw;

        } catch (err) {
            console.log(err)
            return {
                success: false,
                errors: ['Update failed'],
                ext_reference
            }
        }

    } catch (error) {
        console.log(error)
        return {
            success: false,
            errors: ['Update failed'],
            ext_reference
        }
    }
}

module.exports = { creditAccount, completeTransaction, internalTransfer, withdrawal, completeWithdrawal }
const { Model } = require('objection');

class Transaction extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'transactions';
  }
}

module.exports = Transaction;
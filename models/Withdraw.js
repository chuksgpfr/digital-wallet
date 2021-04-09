const { Model } = require('objection');

class Withdraw extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'withdrawal';
  }
}

module.exports = Withdraw;
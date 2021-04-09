const { Model } = require('objection');

class CardTransaction extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'card_transactions';
  }
}

module.exports = CardTransaction;
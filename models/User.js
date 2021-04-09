const { Model } = require('objection');

class User extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'users';
  }
}

module.exports = {
    User,
};
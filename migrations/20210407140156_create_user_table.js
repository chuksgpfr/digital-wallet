exports.up = function(knex) {
    return knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('fullname').notNullable();
        table.string('username').notNullable().unique();
        table.string('email').notNullable().unique();
        table.string('mobile').notNullable().unique();
        table.string('password').notNullable();
        table.datetime('date', {useTz:true, precision: 6 }).defaultTo(knex.fn.now(6));
      });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('users');
};

exports.up = function(knex) {
    return knex.schema.createTable('card_transactions',table=>{
        table.increments('id').primary();
        table.integer('user').unsigned();
        table.string('external_reference');
        table.float('amount', 20).notNullable();
        table.string('latest_response').notNullable();
        table.datetime('created_at', {useTz:true, precision: 6 });
        table.datetime('updated_at', {useTz:true, precision: 6 });
        table.foreign('user').references('id').inTable('users').onDelete('CASCADE');
    })
  
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('card_transactions');
};

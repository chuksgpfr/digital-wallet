exports.up = function(knex) {
    return knex.schema.createTable('account',table=>{
        table.increments('id').primary();
        table.integer('user').unsigned();
        table.float('balance', 20).notNullable();
        table.datetime('created_at', {useTz:true, precision: 6 });
        table.datetime('updated_at', {useTz:true, precision: 6 });
        table.foreign('user').references('id').inTable('users').onDelete('CASCADE');
    })
  
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('account');
};

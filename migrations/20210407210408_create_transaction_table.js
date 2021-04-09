exports.up = function(knex) {
    return knex.schema.createTable('transactions',table=>{
        table.increments('id').primary();
        table.integer('user').unsigned();
        table.enu('transaction_type', ['debit', 'credit'])
        // table.string('transaction_type').notNullable();
        table.enu('purpose', ['deposit', 'transfer', 'withdrawal'])
        //table.string('purpose').notNullable();
        table.float('amount', 20).notNullable();
        table.float('old_balance',20).notNullable();
        table.float('new_balance',20).notNullable();
        table.string('reference').notNullable();
        table.string('ext_reference').notNullable();
        table.datetime('created_at', {useTz:true, precision: 6 });
        table.datetime('updated_at', {useTz:true, precision: 6 });
        table.foreign('user').references('id').inTable('users').onDelete('CASCADE');
    })
  
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('transactions');
};

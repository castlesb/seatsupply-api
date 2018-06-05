// prettier-ignore
module.exports.up = async db => {
  // User accounts
  await db.schema.createTable('users', table => {
    // UUID v1mc reduces the negative side effect of using random primary keys
    // with respect to keyspace fragmentation on disk for the tables because it's time based
    // https://www.postgresql.org/docs/current/static/uuid-ossp.html
    table.uuid('id').notNullable().defaultTo(db.raw('uuid_generate_v1mc()')).primary();
    table.string('email', 100).unique();
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('password_hash', 250);
    table.string('first_name', 200);
    table.string('last_name', 200);
    table.string('image_url', 250);
    table.string('locale', 5).defaultTo('en-US');
    table.string('mobile_number', 20);
    table.string('stripe_customer_id', 200);
    table.timestamps(false, true);
    table.timestamp('last_login_at');
  });

  // External logins with security tokens (e.g. Google, Facebook, Twitter)
  await db.schema.createTable('user_identities', table => {
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('provider', 16).notNullable();
    table.string('provider_id', 36).notNullable();
    table.string('username', 100);
    table.jsonb('credentials').notNullable();
    table.jsonb('profile').notNullable();
    table.timestamps(false, true);
    table.primary(['provider', 'provider_id']);
  });

  // Organizer accounts
  await db.schema.createTable('promoters', table => {
    table.uuid('id').notNullable().defaultTo(db.raw('uuid_generate_v1mc()')).primary();
    table.string('name', 100);
    table.text('description');
    table.string('locale', 5).defaultTo('en-US');
    table.string('image_url', 200);
    table.string('website_url', 200);
    table.string('facebook', 200);
    table.string('twitter', 200);
    table.string('instagram', 200);
    table.string('stripe_account_id', 200);
    table.timestamps(false, true);
  });

  // Organizer members
  await db.schema.createTable('promoter_members', table => {
    table.uuid('promoter_id').notNullable().references('id').inTable('promoters').onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
    table.enu('permission', ['admin', 'member']).defaultTo('member');
    table.primary(['promoter_id', 'user_id']);
  });

  await db.schema.createTable('taxonomies', table => {
    table.increments('id').primary();
    table.integer('parent_id').references('id').inTable('taxonomies').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('name', 50).notNullable();
    table.string('slug', 80).notNullable();
    table.timestamps(false, true);
  });

  await db.schema.createTable('events', table => {
    table.uuid('id').notNullable().defaultTo(db.raw('uuid_generate_v1mc()')).primary();
    table.uuid('promoter_id').references('id').inTable('promoters').onDelete('SET NULL').onUpdate('CASCADE');
    table.integer('taxonomy_id').references('id').inTable('taxonomies').onDelete('SET NULL').onUpdate('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description');
    table.jsonb('venue');
    table.string('timezone', 20).defaultTo('America/New_York');
    table.string('slug', 250);
    table.dateTime('start_date');
    table.dateTime('end_date');
    table.dateTime('publish_date');
    table.enu('status', ['draft', 'active', 'contingent', 'canceled', 'completed', 'postponed']).defaultTo('draft');
    table.timestamps(false, true);
  });

  await db.schema.createTable('offers', table => {
    table.uuid('id').notNullable().defaultTo(db.raw('uuid_generate_v1mc()')).primary();
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('name', 100);
    table.text('description');
    table.decimal('price', 8, 2);
    table.integer('quantity');
    table.integer('min_order_quantity').defaultTo(1);
    table.integer('max_order_quantity');
    table.dateTime('start_sale_date');
    table.dateTime('end_sale_date');
    table.timestamps(false, true);
  });

  await db.schema.createTable('orders', table => {
    table.uuid('id').notNullable().defaultTo(db.raw('uuid_generate_v1mc()')).primary();
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    table.string('first_name', 50);
    table.string('last_name', 50);
    table.string('email', 50);
    table.string('mobile_number', 15);
    table.string('stripe_charge_id', 100);
    table.boolean('is_refunded').defaultTo(false);
    table.timestamps(false, true);
  });

  await db.schema.createTable('tickets', table => {
    table.uuid('id').notNullable().defaultTo(db.raw('uuid_generate_v1mc()')).primary();
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('offer_id').notNullable().references('id').inTable('offers').onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
    table.jsonb('seat_details', 100);
    table.decimal('price', 8, 2);
    table.decimal('service_fee', 8, 2);
    table.string('barcode', 50);
    table.enu('status', ['unused', 'used', 'refunded']).defaultTo('unused');
    table.dateTime('scanned_at');
    table.timestamps(false, true);
  });
};

module.exports.down = async db => {
  await db.schema.dropTableIfExists('taxonomies');
  await db.schema.dropTableIfExists('tickets');
  await db.schema.dropTableIfExists('orders');
  await db.schema.dropTableIfExists('offers');
  await db.schema.dropTableIfExists('events');
  await db.schema.dropTableIfExists('promoter_members');
  await db.schema.dropTableIfExists('promoters');
  await db.schema.dropTableIfExists('user_identities');
  await db.schema.dropTableIfExists('users');
};

module.exports.configuration = { transaction: true };

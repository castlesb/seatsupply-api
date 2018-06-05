/* eslint-disable no-restricted-syntax, no-await-in-loop */

const faker = require('faker');
const bcrypt = require('bcryptjs');

module.exports.seed = async db => {
  const users = [
    {
      first_name: 'John',
      last_name: 'Smith',
      email: 'admin@seatsupply.com',
      password_hash: await bcrypt.hash('password', 10),
      mobile_number: '16319098368',
      image_url: faker.internet.avatar(),
      locale: 'en-US',
    },
  ];

  await Promise.all(
    users.map(user =>
      db
        .table('users')
        .insert(user)
        .returning('id')
        .then(rows =>
          db
            .table('users')
            .where('id', rows[0])
            .first(),
        )
        .then(row => Object.assign(user, row)),
    ),
  );

  const promoters = [
    {
      name: 'Seatsupply',
      locale: 'en-US',
      image_url: faker.internet.avatar(),
    },
  ];

  await Promise.all(
    promoters.map(promoter =>
      db
        .table('promoters')
        .insert(promoter)
        .returning('id')
        .then(rows =>
          db
            .table('promoters')
            .where('id', rows[0])
            .first(),
        )
        .then(row => Object.assign(promoter, row)),
    ),
  );

  const promoterMember = [
    {
      user_id: users[0].id,
      promoter_id: promoters[0].id,
      permission: 'admin',
    },
  ];

  await Promise.all(
    promoterMember.map(member =>
      db
        .table('promoter_members')
        .insert(member)
        .returning('user_id')
        .then(rows =>
          db
            .table('promoter_members')
            .where('user_id', rows[0])
            .first(),
        )
        .then(row => Object.assign(member, row)),
    ),
  );

  const taxonomies = [
    {
      name: 'Sports',
      slug: 'sports',
    },
    {
      name: 'Concert',
      slug: 'concert',
    },
  ];

  await Promise.all(
    taxonomies.map(tax =>
      db
        .table('taxonomies')
        .insert(tax)
        .returning('id')
        .then(rows =>
          db
            .table('taxonomies')
            .where('id', '=', rows[0])
            .first(),
        )
        .then(row => Object.assign(tax, row)),
    ),
  );

  console.log(`TAXONOMY: ${JSON.stringify(taxonomies)}`);

  const events = [
    {
      name: 'Mike Stud',
      description: 'Mike Stud 2018 summer tour.',
      promoter_id: promoters[0].id,
      venue: JSON.stringify({
        name: 'Irving Plaza',
        address1: '17 Irving Pl',
        city: 'New York',
        state: 'NY',
        country: 'US',
        zip: '10003',
      }),
      timezone: 'America/New_York',
      start_date: new Date('2018-07-15T03:00:00'),
      end_date: new Date('2018-07-15T07:00:00'),
      status: 'active',
      taxonomy_id: taxonomies[1].id,
    },
  ];

  await Promise.all(
    events.map(event =>
      db
        .table('events')
        .insert(event)
        .returning('id')
        .then(rows =>
          db
            .table('events')
            .where('id', '=', rows[0])
            .first(),
        )
        .then(row => Object.assign(event, row)),
    ),
  );

  console.log(`EVENT: ${JSON.stringify(events)}`);

  const offers = [
    {
      name: 'General Admission',
      description: 'Standard ticket.',
      quantity: 500,
      price: 10.0,
      event_id: events[0].id,
      min_order_quantity: 1,
      max_order_quantity: 50,
      start_sale_date: new Date(),
      end_sale_date: new Date('2018-07-15T04:00:00'),
    },
  ];

  // Seed offers
  await Promise.all(
    offers.map(offer =>
      db
        .table('offers')
        .insert(offer)
        .returning('id')
        .then(rows =>
          db
            .table('offers')
            .where('id', '=', rows[0])
            .first(),
        )
        .then(row => Object.assign(offer, row)),
    ),
  );
};

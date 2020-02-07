const db = require('../database/dbConfig.js');
const Camp = require('./campaignModel.js');
const CampUpdate = require('./updateModel.js');
const Bookmarks = require('./socialModel');

function find() {
  return db('users')
    .leftJoin('conservationists as cons', 'cons.users_id', 'users.id')
    .leftJoin('supporters as sup', 'sup.users_id', 'users.id')
    .select(
      'users.*',
      'cons.cons_id',
      'cons.org_name',
      'cons.org_link_url',
      'cons.org_link_text',
      'cons.org_cta',
      'cons.about_us',
      'cons.issues',
      'cons.support_us',
      'sup.sup_name',
    );
}

function findUser(id) {
  return db('users')
    .where({ id })
    .first();
}

async function findById(id) {
  let user = await db('users')
    .where({ id })
    .first();

  if (user.roles === 'conservationist') {
    const campaigns = await Camp.findCampByUserId(id);
    const campaignUpdates = await CampUpdate.findUpdatesByUser(id);
    const bookmarks = await Bookmarks.findUserBookmarks(id);
    user = await db('users')
      .leftJoin('conservationists as cons', 'cons.users_id', 'users.id')
      .where('users.id', id)
      .select(
        'users.*',
        'cons.cons_id',
        'cons.org_name',
        'cons.org_link_url',
        'cons.org_link_text',
        'cons.org_cta',
        'cons.about_us',
        'cons.issues',
        'cons.support_us',
        'cons.city',
        'cons.country',
        'cons.point_of_contact_name',
        'cons.point_of_contact_email',
        'cons.latitude',
        'cons.longitude'
      )
      .first();
    user.bookmarks = bookmarks;
    user.campaigns = campaigns.concat(campaignUpdates);
  } else if (user.roles === 'supporter') {
    const bookmarks = await Bookmarks.findUserBookmarks(id);
    user = await db('users')
      .leftJoin('supporters as sup', 'sup.users_id', 'users.id')
      .where('users.id', id)
      .select('users.*', 'sup.sup_name')
      .first();
    user.bookmarks = bookmarks;
  }

  return user;
}

async function findBySub(sub) {
  // This is used only to verify user information at login. It does not collect campaign information.
  let user = await db('users')
    .where({ sub })
    .first();

  const { id } = user;

  if (user.roles === 'conservationist') {
    const bookmarks = await Bookmarks.findUserBookmarks(id);
    user = await db('users')
      .leftJoin('conservationists as cons', 'cons.users_id', 'users.id')
      .where('users.id', id)
      .select(
        'users.*',
        'cons.cons_id',
        'cons.org_name',
        'cons.org_link_url',
        'cons.org_link_text',
        'cons.org_cta',
        'cons.about_us',
        'cons.issues',
        'cons.support_us',
        'cons.longitude',
        'cons.latitude'
      )
      .first();
    user.bookmarks = bookmarks;
  } else if (user.roles === 'supporter') {
    const bookmarks = await Bookmarks.findUserBookmarks(id);
    user = await db('users')
      .leftJoin('supporters as sup', 'sup.users_id', 'users.id')
      .where('users.id', id)
      .select('users.*', 'sup.sup_name')
      .first();
    user.bookmarks = bookmarks;
  }

  return user;
}

// // DO NOT MODIFY. This model is available to the outside.
async function findUserStatus(sub) {
  const user = await db('users')
    .where({ sub })
    .first();

  let subCheck;

  if (user) {
    subCheck = true;
  } else subCheck = false;

  const response = {
    subCheck,
    deactivated: user.is_deactivated
  }

  return response;
}

async function insert(user) {
  const { roles } = user;
  const [id] = await db('users')
    .insert(user)
    .returning('id');
  if (id) {
    if (roles === 'conservationist') {
      await db('conservationists').insert({ users_id: id });
    } else if (roles === 'supporter') {
      await db('supporters').insert({ users_id: id });
    }
    const user = await findById(id);
    return user;
  }
}

async function update(user, id) {
  const userColumns = [
    'username',
    'email',
    'profile_image',
    'location',
    'mini_bio',
    'species_and_habitats',
    'twitter',
    'facebook',
    'instagram',
    'phone_number',
    'is_deactivated',
    'strikes'
  ];
  const consColumns = [
    'org_name',
    'org_link_url',
    'org_link_text',
    'cons.org_cta',
    'org_cta',
    'about_us',
    'issues',
    'support_us',
    'longitude',
    'latitude'
  ];
  const supColumns = ['sup_name'];

  let userUpdate = {};
  let consUpdate = {};
  let supUpdate = {};
  let triggerUsers = false;
  let triggerCons = false;
  let triggerSup = false;

  const keys = Object.keys(user);

  keys.forEach((key) => {
    if (userColumns.includes(key)) {
      triggerUsers = true;
      userUpdate = { ...userUpdate, [key]: user[key] };
    } else if (consColumns.includes(key)) {
      triggerCons = true;
      consUpdate = { ...consUpdate, [key]: user[key] };
    } else if (supColumns.includes(key)) {
      triggerSup = true;
      supUpdate = { ...supUpdate, [key]: user[key] };
    }
  });

  if (triggerUsers) {
    await db('users')
      .where('id', id)
      .update(userUpdate);
  }
  if (triggerCons) {
    await db('conservationists')
      .where('users_id', id)
      .update(consUpdate);
  }
  if (triggerSup) {
    await db('supporters')
      .where('users_id', id)
      .update(supUpdate);
  }
  if (triggerUsers || triggerCons || triggerSup) {
    const newUser = await findById(id);
    return newUser;
  }
}

module.exports = {
  find,
  findUser,
  findById,
  findBySub,
  findUserStatus,
  insert,
  update,
};

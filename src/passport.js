/* @flow */
/* eslint-disable no-param-reassign, no-underscore-dangle, max-len */

import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as TwitterStrategy } from 'passport-twitter';

import db from './db';

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

async function localLogin(req, email, password) {
  let user;

  if (req.user) {
    user = await db
      .table('users')
      .where({ id: req.user.id })
      .first();
  } else {
    user = await db
      .table('users')
      .where({ email: email.toLowerCase() })
      .first();

    if (!user) {
      throw new Error(`Email ${email} not found.`);
    }

    const comparePassword = await bcrypt.compare(password, user.password_hash);
    if (!comparePassword) {
      throw new Error('Invalid password');
    }
  }

  delete user.password_hash;

  return user;
}

// Creates or updates the external login credentials
// and returns the currently authenticated user.
async function externalLogin(req, provider, profile, tokens) {
  let user;

  if (req.user) {
    user = await db
      .table('users')
      .where({ id: req.user.id })
      .first();
  }

  if (!user) {
    user = await db
      .table('logins')
      .innerJoin('users', 'users.id', 'logins.user_id')
      .where({ 'logins.provider': provider, 'logins.id': profile.id })
      .first('users.*');
    if (
      !user &&
      profile.emails &&
      profile.emails.length &&
      profile.emails[0].verified === true
    ) {
      user = await db
        .table('users')
        .innerJoin('emails', 'emails.user_id', 'users.id')
        .where({
          'emails.email': profile.emails[0].value,
          'emails.verified': true,
        })
        .first('users.*');
    }
  }

  if (!user) {
    [user] = await db
      .table('users')
      .insert({
        display_name: profile.displayName,
        image_url:
          profile.photos && profile.photos.length
            ? profile.photos[0].value
            : null,
      })
      .returning('*');

    if (profile.emails && profile.emails.length) {
      await db.table('emails').insert(
        profile.emails.map(x => ({
          user_id: user && user.id,
          email: x.value,
          verified: x.verified || false,
        })),
      );
    }
  }

  const loginKeys = { user_id: user.id, provider, id: profile.id };
  const { count } = await db
    .table('logins')
    .where(loginKeys)
    .count('id')
    .first();

  if (count === '0') {
    await db.table('logins').insert({
      ...loginKeys,
      username: profile.username,
      tokens: JSON.stringify(tokens),
      profile: JSON.stringify(profile._json),
    });
  } else {
    await db
      .table('logins')
      .where(loginKeys)
      .update({
        username: profile.username,
        tokens: JSON.stringify(tokens),
        profile: JSON.stringify(profile._json),
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      });
  }

  return {
    id: user.id,
    displayName: user.display_name,
    imageUrl: user.image_url,
  };
}

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        let user;

        if (req.user) {
          user = await db
            .table('users')
            .where({ id: req.user.id })
            .first();
        } else {
          user = await db
            .table('users')
            .where({ email: email.toLowerCase() })
            .first();

          if (!user) {
            return done(null, false, { message: `Email ${email} not found.` });
          }

          const comparePassword = await bcrypt.compare(
            password,
            user.password_hash,
          );
          if (!comparePassword) {
            return done(null, false, { message: `Invalid password` });
          }
        }

        delete user.password_hash;
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

// https://github.com/jaredhanson/passport-google-oauth2
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: '/login/google/return',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const user = await externalLogin(req, 'google', profile, {
          accessToken,
          refreshToken,
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

// https://github.com/jaredhanson/passport-facebook
// https://developers.facebook.com/docs/facebook-login/permissions/
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
      profileFields: [
        'id',
        'cover',
        'name',
        'age_range',
        'link',
        'gender',
        'locale',
        'picture',
        'timezone',
        'updated_time',
        'verified',
        'email',
      ],
      callbackURL: '/login/facebook/return',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        if (profile.emails.length)
          profile.emails[0].verified = !!profile._json.verified;
        profile.displayName =
          profile.displayName ||
          `${profile.name.givenName} ${profile.name.familyName}`;
        const user = await externalLogin(req, 'facebook', profile, {
          accessToken,
          refreshToken,
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

export default passport;

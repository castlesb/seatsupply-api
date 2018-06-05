/* @flow */

import bcrypt from 'bcryptjs';
import URL from 'url';
import passport from 'passport';
import validator from 'validator';
import { Router } from 'express';
import db from '../db';

const router = new Router();
const bwipjs = require('bwip-js');
const PDFDocument = require('pdfkit');

function generateBarcode(text) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text,
        scale: 5,
        height: 15,
        includetext: false,
        textxalign: 'center',
      },
      (err, png) => {
        if (err) reject(err);
        else resolve(png);
      },
    );
  });
}

router.get('/health-check', (req, res) => {
  res.sendStatus(200);
});

router.get('/orders/:id/pdf', async (req, res, next) => {
  try {
    const order = await db
      .table('orders')
      .where({ id: req.params.id })
      .first();

    const event = await db
      .table('events')
      .where({ id: order.event_id })
      .first();

    const tickets = await db
      .table('tickets')
      .where({ order_id: order.id })
      .select('*');

    await Promise.all(
      tickets.map(ticket =>
        generateBarcode(ticket.barcode).then(image =>
          Object.assign(ticket, { barcode_image: image }),
        ),
      ),
    );

    res.setHeader('Content-type', 'application/pdf');
    const doc = new PDFDocument({ margin: 10 });
    doc.pipe(res);

    for (let i = 0; i < tickets.length; i += 1) {
      if (i > 0) {
        doc.addPage();
      }
      doc.rect(10, 10, 250, 500).stroke();
      doc.image(tickets[i].barcode_image, 60, 20, { width: 150 });
      doc.text(tickets[i].barcode, 20, 65, { width: 230, align: 'center' });
      doc.text(event.name, 20, 100, { width: 230, align: 'center' });
      doc.text(event.start_date.toUTCString(), {
        width: 230,
        align: 'center',
      });
      doc.text(event.venue.name, { width: 230, align: 'center' });
    }

    doc.end();
  } catch (e) {
    next(e);
  }
});

// External login providers. Also see src/passport.js.
const loginProviders = [
  {
    // https://developers.facebook.com/docs/facebook-login/permissions/
    provider: 'facebook',
    options: { scope: ['public_profile', 'email'] },
  },
  {
    provider: 'google',
    options: { scope: 'profile email', accessType: 'offline' },
  },
];

// '/about' => ''
// http://localhost:3000/some/page => http://localhost:3000
function getOrigin(url: string) {
  if (!url || url.startsWith('/')) return '';
  return (x => `${String(x.protocol)}//${String(x.host)}`)(URL.parse(url));
}

// '/about' => `true` (all relative URL paths are allowed)
// 'http://localhost:3000/about' => `true` (but only if its origin is whitelisted)
function isValidReturnURL(url: string) {
  if (url.startsWith('/')) return true;
  const whitelist = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [];
  return (
    validator.isURL(url, {
      require_tld: false,
      require_protocol: true,
      protocols: ['http', 'https'],
    }) && whitelist.includes(getOrigin(url))
  );
}

// Generates a URL for redirecting a user to upon successfull authentication.
// It is intended to support cross-domain authentication in development mode.
// For example, a user goes to http://localhost:3000/login (frontend) to sign in,
// then he's being redirected to http://localhost:8080/login/facebook (backend),
// Passport.js redirects the user to Facebook, which redirects the user back to
// http://localhost:8080/login/facebook/return and finally, user is being redirected
// to http://localhost:3000/?sessionID=xxx where front-end middleware can save that
// session ID into cookie (res.cookie.sid = req.query.sessionID).
function getSuccessRedirect(req) {
  const url = req.query.return || req.body.return || '/';
  if (!isValidReturnURL(url)) return '/';
  if (!getOrigin(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}sessionID=${req.cookies.sid}${
    req.session.cookie.originalMaxAge
      ? `&maxAge=${req.session.cookie.originalMaxAge}`
      : ''
  }`;
}

// Registers route handlers for the external login providers
loginProviders.forEach(({ provider, options }) => {
  router.get(
    `/login/${provider}`,
    (req, res, next) => {
      req.session.returnTo = getSuccessRedirect(req);
      next();
    },
    passport.authenticate(provider, { failureFlash: true, ...options }),
  );

  router.get(`/login/${provider}/return`, (req, res, next) =>
    passport.authenticate(provider, {
      successReturnToOrRedirect: true,
      failureFlash: true,
      failureRedirect: `${getOrigin(req.session.returnTo)}/login`,
    })(req, res, next),
  );
});

router.get('/login', (req, res, next) => {
  req.session.returnTo = getSuccessRedirect(req);
  if (req.user) {
    return res.redirect(req.session.returnTo);
  }
  res.render('login', {
    title: 'Login',
  });
});

router.post('/login', (req, res, next) => {
  req.session.returnTo = getSuccessRedirect(req);
  passport.authenticate('local', {
    successReturnToOrRedirect: true,
    failureFlash: true,
    failureRedirect: `${getOrigin(req.session.returnTo)}/login`,
  })(req, res, next);
});

router.post('/login/clear', (req, res) => {
  req.logout();
  res.status(200).send('OK');
});

router.post('/signup', async (req, res, next) => {
  const input = {};
  req.session.returnTo = getSuccessRedirect(req);

  if (typeof req.body.email === 'undefined' || req.body.email.trim() === '') {
    req.flash('error', { msg: `Missing email field.` });
  } else if (!validator.isEmail(req.body.email)) {
    req.flash('error', { msg: `Invalid email.` });
  } else {
    input.email = req.body.email;
  }

  if (
    typeof req.body.password === 'undefined' ||
    req.body.password.trim() === ''
  ) {
    req.flash('error', { msg: `Missing password field.` });
  } else if (!validator.isLength(req.body.password, { min: 5, max: 100 })) {
    req.flash('error', { msg: `Invalid password.` });
  } else {
    input.password = req.body.password;
  }

  let user = await db
    .table('users')
    .where({ email: input.email })
    .first();

  if (user) {
    req.flash('error', { msg: `Email ${input.email} already exists.` });
    return res.redirect(`${getOrigin(req.session.returnTo)}/login`);
  }

  const hash = await bcrypt.hash(input.password, 10);

  [user] = await db
    .table('users')
    .insert({
      email: input.email,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      image_url: req.body.picture,
      password_hash: hash,
      locale: req.body.locale || 'en-US',
      mobile_number: req.body.mobile_number,
      last_login_at: db.fn.now(),
    })
    .returning('*');

  req.logIn(user, err => {
    if (err) {
      return next(err);
    }
    res.redirect(req.session.returnTo);
  });
});

export default router;

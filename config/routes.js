/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

    '/' : {
        controller: 'main',
        action: 'index'
    },

  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the custom routes above, it   *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

    '/credits' : {
        controller: 'main',
        action: 'credits'
    },

    '/loadEnvPalette' : {
        controller: 'main',
        action: 'loadEnvPalette'
    },

    '/loadItemsPalette' : {
        controller: 'main',
        action: 'loadItemsPalette'
    },

    '/loadCharactersPalette' : {
        controller: 'main',
        action: 'loadCharactersPalette'
    },

    '/loadObjectivesPalette' : {
        controller: 'main',
        action: 'loadObjectivesPalette'
    },

    '/createRealm' : {
        controller: 'questRealm',
        action: 'createRealm'
    },

    '/editRealm' : {
        controller: 'questRealm',
        action: 'editRealm'
    },

    '/deleteRealm' : {
        controller: 'questRealm',
        action: 'deleteRealm'
    },

    '/saveRealm' : {
        controller: 'questRealm',
        action: 'saveRealm'
    },

    '/fetchRealm' : {
        controller: 'questRealm',
        action: 'fetchRealm'
    },

    '/fetchRealms' : {
        controller: 'questRealm',
        action: 'fetchRealms'
    },

    '/checkRealm' : {
        controller: 'questRealm',
        action: 'checkRealm'
    },

    '/createGame' : {
        controller: 'questRealm',
        action: 'createGame'
    },

    '/fetchGame' : {
        controller: 'questRealm',
        action: 'fetchGame'
    },

    '/fetchGames' : {
        controller: 'questRealm',
        action: 'fetchGames'
    },

    '/editGame' : {
        controller: 'questRealm',
        action: 'editGame'
    },

    '/updateGameRealms' : {
        controller: 'questRealm',
        action: 'updateGameRealms'
    },

    '/deleteGame' : {
        controller: 'questRealm',
        action: 'deleteGame'
    },

    '/saveGame' : {
        controller: 'questRealm',
        action: 'saveGame'
    },

    '/playGame' : {
        controller: 'game',
        action: 'playGame'
    },

    '/gameCommand' : {
        controller: 'game',
        action: 'gameCommand'
    },

    '/dummyCommand' : {
        controller: 'game',
        action: 'dummyCommand'
    }

  // By default, your root route (aka home page) points to a view
  // located at `views/home/index.ejs`
  //
  // (This would also work if you had a file at: `/views/home.ejs`)
  /*
  '/': {
    view: 'home/index'
  }
  */

  /*
  // But what if you want your home page to display
  // a signup form located at `views/user/signup.ejs`?
  '/': {
    view: 'user/signup'
  }
  */
};

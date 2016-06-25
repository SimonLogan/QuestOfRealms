/**
 * GameController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of request.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom routes (`config/routes.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = {

    playGame: function(req, res) {
        var gameId = req.param("id");
        sails.log.info("in playGame. id = " + gameId);

        // Find the Game object that has the _id value matching the specified gameId.
        // If you want to check this in the db, use
        //   use QuestOfRealms
        //   db.game.find({'_id': ObjectId('56d1d4ed3f5a79642a3ac0eb')});
        Game.findOne({'_id': gameId}).done(function(err, game) {
            sails.log.info("in Game.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in Game.findById() callback, no error.");
                if (game) {
                    sails.log.info("in Game.findById() callback " + JSON.stringify(game));

                    return res.view("questRealm/playGame", {
                        realm: {
                            id: game.id,
                            name: game.name,
                            width: game.width,
                            height: game.height
                        }
                    });
                } else {
                    sails.log.info("in Game.findById() callback, game is null.");
                    res.send(404, { error: "game not Found" });
                }
            }
        });
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to CharacterController)
   */
  _config: {}
};

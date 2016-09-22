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

// Set up the global parser for all incoming game commands.
//var Parser = require("jison").Parser;

//var grammar = {
//    "lex": {
//        "rules": [
//            ["\\s+", "/* skip whitespace */"],
//            ["move", "return 'MOVE';"],
//            ["[a-zA-Z]+", "return 'TARGET';"]
//        ]
//    },
//
//    "bnf": {
//        "expressions" :[[ "e EOF",   "print($1); return $1;" ]],
//
//        "e" :[[ "MOVE e",   "$$ = $2;" ],
//              [ "TARGET",  "$$ = yytext;" ]]
//    }
//};
//
//var parser = new Parser(grammar);


module.exports = {

    /* Start playing a game */
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

    /* Send commands during a game. */
    gameCommand: function(req, res) {
        var command = req.param("command");
        sails.log.info("in gameCommand. command = " + command);

        var tokens = command.split(" ");
        var success = false;
        sails.log.info("in gameCommand. tokens[0].toUpperCase = " + tokens[0].toUpperCase());
        switch (tokens[0].toUpperCase()) {
            case "MOVE":
                success = handleMove(tokens);
                break;
            case "LOOK":
                success = handleLook(tokens);
                break;
            default:
                handleBadCommand(tokens);
        }

        if (success) {
            res.send(200, {});
        } else {
            res.send(500, {"error": "invalid command"});
        }

        // TODO: figure out how to make the parser handle the business logic.
        // Does it need to worry about threading?
        /* overkill. just use a simple parser for the simple command structure.
        var parsedOk = parser.parse(command);
        if (parsedOk) {
            res.send(200, {});
        } else {
            res.send(500, {"error": "invalid command"});
        }
        */
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to CharacterController)
   */
  _config: {}
};


function handleMove(tokens) {
    sails.log.info("MOVE: " + tokens[1]);
    return true;
}

function handleLook(tokens) {
    sails.log.info("LOOK");
    return true;
}

function handleBadCommand(tokens) {
    sails.log.info("huh? " + tokens);
}

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
                            height: game.height,
                            playerName: game.players[0].name
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
        var command = req.param("command").trim().toLowerCase();
        var playerName = req.param("player").trim();
        var location = req.param("location");
        var gameId = req.param("gameId");
        sails.log.info("in gameCommand. command = " + command);
        sails.log.info("in gameCommand. req = " + req);

        var tokens = command.split(" ");
        switch (tokens[0]) {
            case "move":
                result = handleMove(tokens, gameId, playerName, location, function(handlerResult) {
                    sails.log.info("in gameCommand. handleMove result = " + JSON.stringify(handlerResult));

                    if (!handlerResult.error) {
                        // TODO: remove player from location.characters[].
                        //       add player to handlerResult.newLocation.characters[]
                        //       and save both in the db.
                        res.send(200, handlerResult);
                    } else {
                        res.send(200, handlerResult);
                    }
                });
                break;
            case "look":
                result = handleLook(tokens, gameId, playerName, location, function(handlerResult) {
                    sails.log.info("in gameCommand. handleLook result = " + handlerResult);
                    res.send(200, handlerResult);
                });
                break;
            default:
                result = handleCommand(tokens, gameId, playerName, location, function(handlerResult) {
                    sails.log.info("in gameCommand. handleCommand result = " + handlerResult);
                    res.send(200, handlerResult);
                });
        }
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to CharacterController)
   */
  _config: {}
};


function handleMove(commandTokens, gameId, playerName, location, statusCallback) {
    var direction = commandTokens[1];
    sails.log.info("MOVE: " + direction);

    var deltaX = 0;
    var deltaY = 0;
    if ("north" === direction) deltaY = 1;
    else if ("south" === direction) deltaY = -1;
    else if ("east" === direction) deltaY = -1;
    else if ("west" === direction) deltaY = 1;
    else {
        var errorMessage = "Unknown direction " + direction;
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
    }

    // Does the requested location exist?
    var newX = parseInt(location.x);
    var newY = parseInt(location.y);
    if (isNaN(newX) || isNaN(newY)) {
        sails.log.info("in handleMove.find() invalid start location [" + newX + ", " + newY + "].");
    }

    newX += deltaX;
    newY += deltaY;
    sails.log.info("in handleMove.find() searching for location [" + newX + ", " + newY + "].");
    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': gameId, 'x': newX.toString(), 'y': newY.toString()}).done(function(err, newLocation) {
        sails.log.info("in handleMove.find() callback");
        if (err) {
            sails.log.info("handleMove db err:" + err);
        } else {
            sails.log.info("in handleMove.find() callback, no error.");
            if (newLocation) {
                sails.log.info("in handleMove.find() callback " + JSON.stringify(newLocation));
                statusCallback({error:false, newLocation:newLocation});
            }
            else {
                var errorMessage = "Don't be daft, you'll fall off the end of the world!";
                sails.log.info("new location not found");
                statusCallback({error:true, message:errorMessage});
            }
        }
    });
}

function handleLook(commandTokens, gameId, playerName, location, statusCallback) {
    sails.log.info("LOOK");
    statusCallback({error:false});
}

function handleCommand(commandTokens, gameId, playerName, location, statusCallback) {
    var errorMessage = "Unknown comand";
    sails.log.info(errorMessage);
    statusCallback({error:true, message:errorMessage});
}

function sendCommandResponse(responseStream, response) {
    if (!response.error) {
        responseStream.send(200, response);
    } else {
        responseStream.send(500, response);
    }
}
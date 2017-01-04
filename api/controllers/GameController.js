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

    // Debug: publish an AJAX reponse and some socket messages so the client
    // can test handling of socket messages that arrive while it's processing
    // the AJAX response.
    dummyCommand: function(req, res) {
        sails.log.info("in dummyCommand.");
        sails.log.info("sending 200 response");
        res.send(200);
        sails.log.info("sending socket messages");
        sails.io.sockets.emit("test", {verb: "message", data:"dummy ok 1"});
        sails.io.sockets.emit("test", {verb: "message", data:"dummy ok 2"});
        sails.io.sockets.emit("test", {verb: "message", data:"dummy ok 3"});
        sails.io.sockets.emit("ignoreme", {verb: "test message", data:"dummy ok"});
    },

    /* Send commands during a game. */
    gameCommand: function(req, res) {
        var command = req.param("command").trim().toLowerCase();
        var playerName = req.param("player").trim();
        var gameId = req.param("gameId");

        sails.log.info("in gameCommand. command = " + command);
        sails.log.info("in gameCommand. req = " + req);

        Game.findOne({'_id': gameId}).done(function(err, game) {
            sails.log.info("in Game.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in Game.findById() callback, no error.");
                if (game) {
                    sails.log.info("in Game.findById() callback " + JSON.stringify(game));

                    // Split the comandline into whitespace-separated tokens. Remove the first and use
                    // this as the command verb. The others are the args.
                    var tokens = command.split(" ");
                    var verb = tokens.shift();
                    switch (verb) {
                        case "move":
                            result = handleMove(tokens, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleMove result = " + JSON.stringify(handlerResult));

                                if (!handlerResult.error) {
                                    sails.log.info("sending 200 response");
                                    res.send(200);
                                } else {
                                    res.send(200, handlerResult);
                                }
                            });
                            break;
                        case "take":
                            result = handleTake(tokens, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleTake result = " + JSON.stringify(handlerResult));

                                if (!handlerResult.error) {
                                    sails.log.info("sending 200 response");
                                    res.send(200);
                                } else {
                                    res.send(200, handlerResult);
                                }
                            });
                            break;
                        case "drop":
                            result = handleDrop(tokens, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleDrop result = " + JSON.stringify(handlerResult));

                                if (!handlerResult.error) {
                                    sails.log.info("sending 200 response");
                                    res.send(200);
                                } else {
                                    res.send(200, handlerResult);
                                }
                            });
                            break;
                        default:
                            result = handleCommand(tokens, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleCommand result = " + handlerResult);
                                res.send(200, handlerResult);
                            });
                    }

                } else {
                    sails.log.info("in Game.findById() callback, realm is null.");
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


function handleMove(commandArgs, game, playerName, statusCallback) {
    var direction = commandArgs[0];
    sails.log.info("MOVE: " + direction);

    var deltaX = 0;
    var deltaY = 0;

    switch(direction) {
        case "north":
            deltaY = 1;
            break;
        case "northeast":
            deltaX = 1;
            deltaY = 1;
            break;
        case "east":
            deltaX = 1;
            break;
        case "southeast":
            deltaX = 1;
            deltaY = -1;
            break;
        case "south":
            deltaY = -1;
            break;
        case "southwest":
            deltaX = -1;
            deltaY = -1;
            break;
        case "west":
            deltaX = -1;
            break;
        case "northwest":
            deltaX = -1;
            deltaY = 1;
            break;
        default:
            var errorMessage = "Unknown direction " + direction;
            sails.log.info(errorMessage);
            statusCallback({error:true, message:errorMessage});
    }

    // Does the requested location exist? First get the current player location.
    var playerIndex = null;
    for (var i=0; i<game.players.length; i++) {
        if (game.players[i].name === playerName) {
            playerIndex = i;
            break;
        }
    }

    if (null === playerIndex) {
        sails.log.info("in handleMove.find() invalid current location.");
        statusCallback({error:true, message:"Invalid current location"});
    }

    var originalX = parseInt(game.players[playerIndex].location.x);
    var originalY = parseInt(game.players[playerIndex].location.y);
    var newX = originalX + deltaX;
    var newY = originalY + deltaY;
    sails.log.info("in handleMove.find() searching for location [" + newX + ", " + newY + "].");

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': newX.toString(), 'y': newY.toString()}).done(function(err, newLocation) {
        sails.log.info("in handleMove.find() callback");
        if (err) {
            sails.log.info("handleMove db err:" + err);
            statusCallback({error:true, message:err});
        } else {
            sails.log.info("in handleMove.find() callback, no error.");
            if (newLocation) {
                sails.log.info("in handleMove.find() callback " + JSON.stringify(newLocation));

                game.players[playerIndex].location.x = newX.toString();
                game.players[playerIndex].location.y = newY.toString();
                Game.update(
                    {'_id': game.id},
                    game).done(function(err, updatedGame) {
                    sails.log.info("in Game.update() callback");
                    if (err) {
                        sails.log.info("in Game.update() callback, error. " + err);
                        statusCallback({error:true, message:err});
                    } else {
                        sails.log.info("in Game.update() callback, no error.");
                        if (updatedGame) {
                            sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));

                            sails.log.info("sending socket messages for subject '" + game.id + "-status'");
                            sails.io.sockets.emit(
                                game.id + "-status",
                                {
                                    player: playerName,
                                    description: {
                                        action: "move",
                                        from: {x:originalX, y:originalY},
                                        to: {x:newX, y:newY}
                                    },
                                    data: {
                                        game: updatedGame
                                    }
                                });

                            statusCallback({error:false, data:updatedGame});
                        } else {
                            sails.log.info("in Game.update() callback, item is null.");
                            statusCallback({error:true, message:"failed to find game"});
                        }
                    }
                });
            }
            else {
                var errorMessage = "Don't be daft, you'll fall off the end of the world!";
                sails.log.info("new location not found");
                statusCallback({error:true, message:errorMessage});
            }
        }
    });
}

function handleTake(commandArgs, game, playerName, statusCallback) {
    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    var target = commandArgs.join(" ");
    sails.log.info("TAKE: " + target);

    // Get the current player location.
    var playerIndex = null;
    for (var i=0; i<game.players.length; i++) {
        if (game.players[i].name === playerName) {
            playerIndex = i;
            break;
        }
    }

    if (null === playerIndex) {
        sails.log.info("in handleTake.find() invalid current location.");
        statusCallback({error:true, message:"Invalid current location"});
    }

    var currentX = parseInt(game.players[playerIndex].location.x);
    var currentY = parseInt(game.players[playerIndex].location.y);

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': currentX.toString(), 'y': currentY.toString()}).done(function(err, currentLocation) {
        sails.log.info("in handleTake.find() callback");
        if (err) {
            sails.log.info("in handleTake db err:" + err);
            statusCallback({error:true, message:err});
        } else {
            sails.log.info("in handleTake.find() callback, no error.");
            if (currentLocation) {
                sails.log.info("in handleTake.find() callback " + JSON.stringify(currentLocation));

                // Find the requested item in the current mapLocation.
                var found = false;
                for (var i=0; i<currentLocation.items.length; i++) {
                    // TODO: handle ambiguous object descriptions (e.g. "take sword" when there are two swords).
                    if (currentLocation.items[i].type === target) {
                        found = true;
                        var item = currentLocation.items[i];
                        if (undefined === game.players[playerIndex].inventory) {
                            game.players[playerIndex].inventory = [];
                        }
                        game.players[playerIndex].inventory.push(item);
                        currentLocation.items.splice(i, 1);

                        // TODO: serious limitation - waterline doesn't support transactions so
                        // if anything below fails the db could be left in an inconsistent state.
                        // See if I can implement this myself using the .transaction() interface.
                        Game.update(
                            {'_id': game.id},
                            game).done(function(err, updatedGame) {
                            sails.log.info("in Game.update() callback");
                            if (err) {
                                sails.log.info("in Game.update() callback, error. " + err);
                                statusCallback({error:true, message:err});
                            } else {
                                sails.log.info("in Game.update() callback, no error.");
                                if (updatedGame) {
                                    sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));

                                    MapLocation.update(
                                        {'_id': currentLocation.id},
                                        currentLocation).done(function(err, updatedLocation) {
                                        sails.log.info("in MapLocation.update() callback");
                                        if (err) {
                                            sails.log.info("in MapLocation.update() callback, error. " + err);
                                            statusCallback({error: true, message: err});
                                        } else {
                                            sails.log.info("in MapLocation.update() callback, no error.");
                                            if (updatedLocation) {
                                                sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                                                sails.log.info("sending socket messages for subject '" + game.id + "-status'");
                                                sails.io.sockets.emit(
                                                    game.id + "-status",
                                                    {
                                                        player: playerName,
                                                        description: {
                                                            action: "take",
                                                            item: item
                                                        },
                                                        data: {
                                                            game: updatedGame,
                                                            location: updatedLocation
                                                        }
                                                    });

                                                statusCallback({error: false, data: updatedGame});
                                            } else {
                                                sails.log.info("in MapLocation.update() callback, item is null.");
                                                statusCallback({error: true, message: "failed to find MapLocation"});
                                            }
                                        }
                                    });
                                } else {
                                    sails.log.info("in Game.update() callback, item is null.");
                                    statusCallback({error:true, message:"failed to find game"});
                                }
                            }
                        });

                        break;
                    }

                    if (!found) {
                        var errorMessage = "There is no " + target + ".";
                        sails.log.info(errorMessage);
                        statusCallback({error:true, message:errorMessage});
                    }
                }
            }
            else {
                var errorMessage = "Current location not found";
                sails.log.info("Current location not found");
                statusCallback({error:true, message:errorMessage});
            }
        }
    });
}

function handleDrop(commandArgs, game, playerName, statusCallback) {
    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    var target = commandArgs.join(" ");
    sails.log.info("DROP: " + target);

    // Get the current player location.
    var playerIndex = null;
    for (var i=0; i<game.players.length; i++) {
        if (game.players[i].name === playerName) {
            playerIndex = i;
            break;
        }
    }

    if (null === playerIndex) {
        sails.log.info("in handleDrop.find() invalid current location.");
        statusCallback({error:true, message:"Invalid current location"});
    }

    var currentX = parseInt(game.players[playerIndex].location.x);
    var currentY = parseInt(game.players[playerIndex].location.y);

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': currentX.toString(), 'y': currentY.toString()}).done(function(err, currentLocation) {
        sails.log.info("in handleDrop.find() callback");
        if (err) {
            sails.log.info("in handleDrop db err:" + err);
            statusCallback({error:true, message:err});
        } else {
            sails.log.info("in handleDrop.find() callback, no error.");
            if (currentLocation) {
                sails.log.info("in handleDrop.find() callback " + JSON.stringify(currentLocation));

                // Find the requested item in the inventory.
                for (var i=0; i<game.players[playerIndex].inventory.length; i++) {
                    // TODO: handle ambiguous object descriptions (e.g. "drop sword" when there are two swords).
                    if (game.players[playerIndex].inventory[i].type === target) {
                        found = true;
                        var item = game.players[playerIndex].inventory[i];
                        if (undefined === currentLocation.items) {
                            currentLocation.items = [];
                        }
                        currentLocation.items.push(item);
                        game.players[playerIndex].inventory.splice(i, 1);

                        // TODO: serious limitation - waterline doesn't support transactions so
                        // if anything below fails the db could be left in an inconsistent state.
                        // See if I can implement this myself using the .transaction() interface.
                        Game.update(
                            {'_id': game.id},
                            game).done(function(err, updatedGame) {
                            sails.log.info("in Game.update() callback");
                            if (err) {
                                sails.log.info("in Game.update() callback, error. " + err);
                                statusCallback({error:true, message:err});
                            } else {
                                sails.log.info("in Game.update() callback, no error.");
                                if (updatedGame) {
                                    sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));

                                    MapLocation.update(
                                        {'_id': currentLocation.id},
                                        currentLocation).done(function(err, updatedLocation) {
                                        sails.log.info("in MapLocation.update() callback");
                                        if (err) {
                                            sails.log.info("in MapLocation.update() callback, error. " + err);
                                            statusCallback({error: true, message: err});
                                        } else {
                                            sails.log.info("in MapLocation.update() callback, no error.");
                                            if (updatedLocation) {
                                                sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                                                sails.log.info("sending socket messages for subject '" + game.id + "-status'");
                                                sails.io.sockets.emit(
                                                    game.id + "-status",
                                                    {
                                                        player: playerName,
                                                        description: {
                                                            action: "drop",
                                                            item: item,
                                                        },
                                                        data: {
                                                            location: updatedLocation,
                                                            game: updatedGame
                                                        }
                                                    });

                                                statusCallback({error: false, data: updatedGame});
                                            } else {
                                                sails.log.info("in MapLocation.update() callback, item is null.");
                                                statusCallback({error: true, message: "failed to find MapLocation"});
                                            }
                                        }
                                    });
                                } else {
                                    sails.log.info("in Game.update() callback, item is null.");
                                    statusCallback({error:true, message:"failed to find game"});
                                }
                            }
                        });

                        break;
                    }

                    if (!found) {
                        var errorMessage = "There is no " + target + ".";
                        sails.log.info(errorMessage);
                        statusCallback({error:true, message:errorMessage});
                    }
                }
            }
            else {
                var errorMessage = "Current location not found";
                sails.log.info("Current location not found");
                statusCallback({error:true, message:errorMessage});
            }
        }
    });
}

function handleCommand(commandTokens, game, playerName, statusCallback) {
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
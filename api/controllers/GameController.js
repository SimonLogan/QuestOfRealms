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

// Find a player.
class playerInfo {
    constructor(player, playerIndex) {
        this.player = player;
        this.playerIndex = playerIndex;
   }
}

class findPlayer {
    static findPlayerByName(game, playerName) {
        for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].name === playerName) {
                return new playerInfo(game.players[i], i);
            }
        }

		    return null;
    }
}

// Find an item
class itemInfo {
    constructor(item, itemIndex) {
        this.item = item;
        this.itemIndex = itemIndex;
   }
}

class findItem {
    static findLocationItemByType(location, itemType) {
        if (location.items === undefined) {
		        return null;
        }

        for (var i = 0; i < location.items.length; i++) {
            // TODO: handle ambiguous object descriptions (e.g. "take sword" when there are two swords).
            if (location.items[i].type === itemType) {
    		         return new itemInfo(location.items[i], i);
   	        }
        }

		    return null;
    }
}

// Find a character
class characterInfo {
    constructor(character, characterIndex) {
        this.character = character;
        this.characterIndex = characterIndex;
   }
}

class findCharacter {
    static findLocationCharacterByType(location, characterType) {
        if (location.characters === undefined) {
		        return null;
        }

        for (var i = 0; i < location.characters.length; i++) {
            if (location.characters[i].type === characterType) {
    		         return new characterInfo(location.characters[i], i);
   	        }
        }

		    return null;
    }
}

// For string template substitution.
var template = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]);


module.exports = {

    /* Start playing a game */
    playGame: function(req, res) {
        var gameId = req.param("id");
        sails.log.info("in playGame. id = " + gameId);

        // Find the Game object that has the id value matching the specified gameId.
        // If you want to check this in the db, use
        //   use QuestOfRealms
        //   db.game.find({id: ObjectId('56d1d4ed3f5a79642a3ac0eb')});
        Game.findOne({id: gameId}).exec(function(err, game) {
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
        var command = req.param("command").trim();
        var playerName = req.param("player").trim();
        var gameId = req.param("gameId");

        sails.log.info("in gameCommand. command = " + command);
        sails.log.info("in gameCommand. req = " + req);

        Game.findOne({id: gameId}).exec(function(err, game) {
            sails.log.info("in Game.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in Game.findById() callback, no error.");
                if (game) {
                    sails.log.info("in Game.findById() callback " + JSON.stringify(game));

                    function sendCommandStatus(handlerResult) {
                        if (!handlerResult.error) {
                            sails.log.info("sending OK response");
                        } else {
                            sails.log.info("sending error response");
                        }

                        res.send(200, handlerResult);
                    }

                    // Split the comandline into whitespace-separated tokens. Remove the first and use
                    // this as the command verb. The others are the args.
                    var tokens = command.split(" ");
                    var verb = tokens.shift();
                    switch (verb) {
                        // Pass the raw command to the handlers as they may need to split it
                        // in command-specific ways.
                        case "move":
                            result = handleMove(command, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleMove result = " + JSON.stringify(handlerResult));
                                sendCommandStatus(handlerResult);
                                if (handlerResult.hasOwnProperty("data")) {
                                   checkObjectives(handlerResult.data.data.game[0], playerName);
                                }
                            });
                            break;
                        case "take":
                            result = handleTake(command, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleTake result = " + JSON.stringify(handlerResult));
                                sendCommandStatus(handlerResult);
                                if (handlerResult.hasOwnProperty("data")) {
                                   checkObjectives(handlerResult.data.data.game[0], playerName);
                                }
                            });
                            break;
                        case "buy":
                            result = handleBuy(command, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleBuy result = " + JSON.stringify(handlerResult));
                                sendCommandStatus(handlerResult);
                                if (handlerResult.hasOwnProperty("data")) {
                                   checkObjectives(handlerResult.data.data.game[0], playerName);
                                }
                            });
                            break;
                        case "drop":
                            result = handleDrop(command, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleDrop result = " + JSON.stringify(handlerResult));
                                sendCommandStatus(handlerResult);
                                if (handlerResult.hasOwnProperty("data")) {
                                   checkObjectives(handlerResult.data.data.game[0], playerName);
                                }
                            });
                            break;
                        case "give":
                            result = handleGive(command, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleGive result = " + JSON.stringify(handlerResult));
                                sendCommandStatus(handlerResult);

                                if (handlerResult.hasOwnProperty("data")) {
                                   checkObjectives(handlerResult.data.data.game[0], playerName);
                                }
                            });
                            break;
                        case "use":
                            result = handleUse(command, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleUse result = " + JSON.stringify(handlerResult));
                                sendCommandStatus(handlerResult);

                                if (handlerResult.hasOwnProperty("data")) {
                                   checkObjectives(handlerResult.data.data.game[0], playerName);
                                }
                            });
                            break;
                        case "fight":
                            result = handleFight(command, game, playerName, function(handlerResult) {
                                sails.log.info("in gameCommand. handleFight result = " + JSON.stringify(handlerResult));
                                sendCommandStatus(handlerResult);

                                if (handlerResult.hasOwnProperty("data")) {
                                   checkObjectives(handlerResult.data.data.game[0], playerName);
                                }
                            });
                            break;
                        default:
                            result = handleCommand(command, game, playerName, function(handlerResult) {
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


function handleMove(command, game, playerName, statusCallback) {
    var direction = command.replace(/move[\s+]/i, "");
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
            return;
    }

    // Does the requested location exist? First get the current player location.
    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        sails.log.info("in handleUse.find() invalid player.");
        statusCallback({error:true, message:"Invalid player"});
		    return;
    }

    var originalX = parseInt(game.players[playerInfo.playerIndex].location.x);
    var originalY = parseInt(game.players[playerInfo.playerIndex].location.y);
    var newX = originalX + deltaX;
    var newY = originalY + deltaY;
    sails.log.info("in handleMove.find() searching for location [" + newX + ", " + newY + "].");

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': newX.toString(), 'y': newY.toString()}).exec(function(err, newLocation) {
        var notifyData = {};

        sails.log.info("in handleMove.find() callback");
        if (err) {
            sails.log.info("handleMove db err:" + err);
            statusCallback({error:true, message:err});
            return;
        }

        sails.log.info("in handleMove.find() callback, no error.");
        if (!newLocation) {
            var errorMessage = "Don't be daft, you'll fall off the end of the world!";
            sails.log.info("new location not found");
            statusCallback({error:true, message:errorMessage});
            return;
        }

        sails.log.info("in handleMove.find() callback " + JSON.stringify(newLocation));

        // Ensure the player has enough health to move into the new location.
        // TODO: decide whether we want to use health for this. Do we need a
        // separate stamina figure for travel, and reserve health for fighting?
        /*
        var healthCost = newLocation.healthCost;
        var playerHealth = game.players[playerInfo.playerIndex].health;
        if (healthCost >= playerHealth) {
           sails.log.info("Not enough health (" + playerHealth + ")" +
                          " to move into location (cost:" + healthCost + ")." +
                          " You died.");
           game.players[playerInfo.playerIndex].health = 0;
           notifyData = {
              player: playerName,
              description: {
                 action: "death",
                 details: "You did not have enough health to move into that location."
              },
              data: {}
           };
        } else {
           game.players[playerInfo.playerIndex].health -= healthCost;
        */
           game.players[playerInfo.playerIndex].location.x = newX.toString();
           game.players[playerInfo.playerIndex].location.y = newY.toString();

           // Update the list of locations the player has visited.
           // This is a dictionary for quick searching. Using a list
           // will scale badly when drawing the whole map on the UI.
           var visitedKey = newX.toString() + "_" + newY.toString();
           var playerVistitedLocation = (visitedKey in game.players[playerInfo.playerIndex].visited);
           if (!playerVistitedLocation) {
               game.players[playerInfo.playerIndex].visited[visitedKey] = true;
           }

           notifyData = {
              player: playerName,
              description: {
                 action: "move",
                 message: "You have moved to location [" + newX + "," + newY + "].",
                 from: {x:originalX, y:originalY},
                 to: {x:newX, y:newY}
              },
              data: {}
           };
        /*
        }
        */

        Game.update(
            {id: game.id},
            game).exec(function(err, updatedGame) {
            sails.log.info("in Game.update() callback");
            if (err) {
                sails.log.info("in Game.update() callback, error. " + err);
                statusCallback({error:true, message:err});
                return;
            }

            sails.log.info("in Game.update() callback, no error.");
            if (!updatedGame) {
                sails.log.info("in Game.update() callback, item is null.");
                statusCallback({error:true, message:"failed to find game"});
                return;
            }

            sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));
            sails.log.info("sending socket messages for subject '" + game.id + "-status'");
            notifyData.data = {game: updatedGame};
            sails.io.sockets.emit(game.id + "-status", notifyData);
            statusCallback({error:false, data:notifyData});
            return;
        });
    });
}

function handleTake(command, game, playerName, statusCallback) {
    command = command.replace(/take[\s+]/i, "");
    var commandArgs = command.split("from");
    var objectName = commandArgs[0].trim();
    var targetName = null;
    if (commandArgs.length === 1) {
       sails.log.info("TAKE: " + objectName);
    } else {
       // "take object from NPC"
       targetName = commandArgs[1].trim();
       sails.log.info("TAKE: " + objectName + " from " + targetName);
    }

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".

    // Get the current player location.
    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        sails.log.info("in handleTake.find() invalid player.");
        statusCallback({error:true, message:"Invalid player"});
		    return;
    }

    var currentX = parseInt(playerInfo.player.location.x);
    var currentY = parseInt(playerInfo.player.location.y);

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': currentX.toString(), 'y': currentY.toString()}).exec(function(err, currentLocation) {
        sails.log.info("in handleTake.find() callback");
        if (err) {
            sails.log.info("in handleTake db err:" + err);
            statusCallback({error:true, message:err});
			      return;
        }

        sails.log.info("in handleTake.find() callback, no error.");
        if (!currentLocation) {
            var errorMessage = "Current location not found";
            sails.log.info("Current location not found");
            statusCallback({error:true, message:errorMessage});
			      return;
        }

        sails.log.info("in handleTake.find() callback " + JSON.stringify(currentLocation));

        if (!targetName) {
           handleTakeFromLocation(objectName, currentLocation, game, playerName, playerInfo.playerIndex, statusCallback);
        } else {
           handleTakeFromNPC(objectName, targetName, currentLocation, game, playerName, playerInfo.playerIndex, statusCallback);
        }
    });
}

function handleTakeFromLocation(objectName, currentLocation, game, playerName, playerIndex, statusCallback) {
    sails.log.info("In handleTakeFromLocation()");

    // Find the requested item in the current mapLocation.
    var itemInfo = findItem.findLocationItemByType(currentLocation, objectName);
    if (itemInfo === null) {
        var errorMessage = "There is no " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    if (undefined === game.players[playerIndex].inventory) {
        game.players[playerIndex].inventory = [];
    }

    game.players[playerIndex].inventory.push(itemInfo.item);
    currentLocation.items.splice(itemInfo.itemIndex, 1);

    // TODO: serious limitation - waterline doesn't support transactions so
    // if anything below fails the db could be left in an inconsistent state.
    // See if I can implement this myself using the .transaction() interface.
    Game.update(
        {id: game.id},
        game).exec(function(err, updatedGame) {
        sails.log.info("in Game.update() callback");
        if (err) {
            sails.log.info("in Game.update() callback, error. " + err);
            statusCallback({error:true, message:err});
			          return;
        }

        sails.log.info("in Game.update() callback, no error.");
        if (!updatedGame) {
            sails.log.info("in Game.update() callback, item is null.");
            statusCallback({error:true, message:"failed to find game"});
			          return;
		        }

        sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));

        MapLocation.update(
            {id: currentLocation.id},
            currentLocation).exec(function(err, updatedLocation) {
            sails.log.info("in MapLocation.update() callback");
            if (err) {
                sails.log.info("in MapLocation.update() callback, error. " + err);
                statusCallback({error: true, message: err});
				            return;
            }

            sails.log.info("in MapLocation.update() callback, no error.");
            if (!updatedLocation) {
                sails.log.info("in MapLocation.update() callback, item is null.");
                statusCallback({error: true, message: "failed to find MapLocation"});
				            return;
			          }

            sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
            sails.log.info("sending socket messages for subject '" + game.id + "-status'");
            notifyData = {
               player: playerName,
               description: {
                   action: "take",
                   message: "You have taken a " + itemInfo.item.type,
                   item: itemInfo.item
               },
               data: {
                   game: updatedGame,
                   location: updatedLocation
               }
            };

            sails.io.sockets.emit(game.id + "-status", notifyData);
            statusCallback({error: false, data:notifyData});
			        return;
        });
    });
}

function handleTakeFromNPC(objectName, targetName, currentLocation, game, playerName, playerIndex, statusCallback) {
    sails.log.info("In handleTakeFromNPC()");

    // Find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Found targetName: " + JSON.stringify(targetName));

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Checking inventory");
    var itemFound = false;
    var object = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
       if (characterInfo.character.inventory[j].type === objectName) {
		        itemFound = true;
		        object = characterInfo.character.inventory[j];
		        characterInfo.character.inventory.splice(j, 1);
		        sails.log.info("Found item in inventory");
	     }
    }

    if (!itemFound) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Found objectName: " + JSON.stringify(characterInfo.character.inventory[j]));
    sails.log.info("characterIndex: " + characterInfo.characterIndex);

    // We found the item. See if we can take it.
    var path = require('path');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var handlerPath =  pathroot + characterInfo.character.module + "/" + characterInfo.character.filename;
    var module = require(handlerPath);

    // Command handlers are optional.
    if (module.handlers === undefined) {
       sails.log.info("1 Module: " + handlerPath +
                      " does not have a handler for \"take from\".");
       statusCallback({error:true, message:"The " + targetName + " won't give you the " + objectName});
       return;
    }

    var handlerFunc = module.handlers["take from"];
    if (handlerFunc === undefined) {
       sails.log.info("2 Module: " + handlerPath +
                      " does not have a handler for \"take from\".");
       statusCallback({error:true, message:"The " + targetName + " won't give you the " + objectName});
       return;
    }

    sails.log.info("calling take from()");
    handlerFunc(characterInfo.character, object, game, playerName, function(handlerResp) {
       sails.log.info("handlerResp: " + handlerResp);
       if (!handlerResp) {
           sails.log.info("1 Take from failed - null handlerResp");
           statusCallback({error:true, message:"The " + targetName + " won't give you the " + objectName});
           return;
       }

       sails.log.info("Valid handlerResp " + JSON.stringify(handlerResp));
       if (!handlerResp.description.success) {
           sails.log.info("2 Take from failed: " + handlerResp.description.detail);
           statusCallback({error:true, message:handlerResp.description.detail});
           return;
       }

       // We don't need to send the updated target on to the client.
       // Instead we'll send the updated game and mapLocation.
       handlerResp.data = {};

       // Take worked, so update the target.
       // Record who we took the object from so we can check for
       // "acquire from" objectives.
       object.source = {reason:"take from", from:targetName};

       if (game.players[playerIndex].inventory === undefined) {
           game.players[playerIndex].inventory = [];
       }
       game.players[playerIndex].inventory.push(object);
       currentLocation.characters[recipientIndex] = character;

       async.waterfall([
           function updateGame(validationCallback) {
               Game.update(
                  {id: game.id},
                   game).exec(function(err, updatedGame) {
                     sails.log.info("take from() Game.update() callback");
                     if (err) {
                        sails.log.info("take from() Game.update() callback, error. " + err);
                        validationCallback("Failed to save the game");
                     } else {
                        sails.log.info("take from() Game.update() callback, no error.");
                        if (updatedGame) {
                           sails.log.info("take from() Game.update() callback " + JSON.stringify(updatedGame));
                           validationCallback(null, updatedGame);
                        } else {
                           sails.log.info("take from() Game.update() callback, game is null.");
                           validationCallback("Failed to save the game");
                        }
                     }
               });
           },
           function updateMapLocation(updatedGame, validationCallback) {
               MapLocation.update(
                   {id: currentLocation.id},
                   currentLocation).exec(function(err, updatedLocation) {
                   sails.log.info("in MapLocation.update() callback");
                   if (err) {
                       sails.log.info("in MapLocation.update() callback, error. " + err);
                        validationCallback("Failed to save the maplocation");
                   } else {
                       sails.log.info("in MapLocation.update() callback, no error.");
                       if (updatedLocation) {
                           sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                           validationCallback(null, updatedGame, updatedLocation);
                       } else {
                           sails.log.info("in MapLocation.update() callback, item is null.");
                           validationCallback("Failed to save the maplocation");
                       }
                   }
               });
           }
       ], function (err, updatedGame, updatedLocation) {
           sails.log.info("in take from() all done. err:" + err);
           sails.log.info("in take from() all done. updatedGame:" + JSON.stringify(updatedGame));
           sails.log.info("in take from() all done. updatedLocation:" + JSON.stringify(updatedLocation));
           if (err) {
               statusCallback({error: true, data: updatedGame});
               return;
           }

           handlerResp.data['game'] = updatedGame;
           handlerResp.data['location'] = updatedLocation;
           sails.log.info("*** sending resp: " + JSON.stringify(handlerResp));
           handlerResp.data = {game:updatedGame, location:updatedLocation};
           sails.io.sockets.emit(game.id + "-status", handlerResp);

           statusCallback({error: false, data:handlerResp});
       });
    });
}

function handleBuy(command, game, playerName, statusCallback) {
    command = command.replace(/buy[\s+]/i, "");
    var commandArgs = command.split("from");
    var objectName = commandArgs[0].trim();
    var targetName = null;

    // You can only buy from an NPC, so one must be specified.
    if (commandArgs.length === 1) {
        sails.log.info("in handleBuy.find() invalid NPC.");
        statusCallback({error:true, message:"Invalid NPC"});
		    return;
    }

    targetName = commandArgs[1].trim();
    sails.log.info("BUY: " + objectName + " from " + targetName);

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".

    // Get the current player location.
    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        sails.log.info("in handleBuy.find() invalid player.");
        statusCallback({error:true, message:"Invalid player"});
		    return;
    }

    var currentX = parseInt(playerInfo.player.location.x);
    var currentY = parseInt(playerInfo.player.location.y);

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': currentX.toString(), 'y': currentY.toString()}).exec(function(err, currentLocation) {
        sails.log.info("in handleBuy.find() callback");
        if (err) {
            sails.log.info("in handleBuy db err:" + err);
            statusCallback({error:true, message:err});
			      return;
        }

        sails.log.info("in handleBuy.find() callback, no error.");
        if (!currentLocation) {
            var errorMessage = "Current location not found";
            sails.log.info("Current location not found");
            statusCallback({error:true, message:errorMessage});
			      return;
        }

        sails.log.info("in handleBuy.find() callback " + JSON.stringify(currentLocation));

        handleBuyFromNPC(objectName, targetName, currentLocation, game, playerName, playerInfo.playerIndex, statusCallback);
    });
}

function handleBuyFromNPC(objectName, targetName, currentLocation, game, playerName, playerIndex, statusCallback) {
    sails.log.info("In handleBuyFromNPC()");

    // Find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Found targetName: " + JSON.stringify(targetName));

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Checking inventory");
    var itemFound = false;
    var object = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
       if (characterInfo.character.inventory[j].type === objectName) {
            // Assume the buy will be successful. If not, we will
            // discard this edit.
		        itemFound = true;
		        object = characterInfo.character.inventory[j];
		        characterInfo.character.inventory.splice(j, 1);
		        sails.log.info("Found item in inventory");
	     }
    }

    if (!itemFound) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Found objectName: " + JSON.stringify(characterInfo.character.inventory[j]));
    sails.log.info("characterIndex: " + characterInfo.characterIndex);

    // We found the item. See if we can buy it.
    var path = require('path');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var handlerPath =  pathroot + characterInfo.character.module + "/" + characterInfo.character.filename;
    var module = require(handlerPath);

    // Command handlers are optional.
    if (module.handlers === undefined) {
       sails.log.info("1 Module: " + handlerPath +
                      " does not have a handler for \"buy from\".");
       statusCallback({error:true, message:"The " + targetName + " won't sell you the " + objectName});
       return;
    }

    var handlerFunc = module.handlers["buy from"];
    if (handlerFunc === undefined) {
       sails.log.info("2 Module: " + handlerPath +
                      " does not have a handler for \"buy from\".");
       statusCallback({error:true, message:"The " + targetName + " won't sell you the " + objectName});
       return;
    }

    sails.log.info("calling buy from()");
    handlerFunc(characterInfo.character, object, game, playerName, function(handlerResp) {
       sails.log.info("handlerResp: " + handlerResp);
       if (!handlerResp) {
           sails.log.info("1 Buy from failed - null handlerResp");
           statusCallback({error:true, message:"The " + targetName + " won't sell you the " + objectName});
           return;
       }

       sails.log.info("Valid handlerResp " + JSON.stringify(handlerResp));
       if (!handlerResp.description.success) {
           sails.log.info("2 Buy from failed: " + handlerResp.description.detail);
           statusCallback({error:true, message:handlerResp.description.detail});
           return;
       }

       // Buy worked, so update the player and target.
       // Record who we bought the object from so we can check for
       // "acquire from" objectives.
       object.source = {reason:"buy from", from:targetName};

       if (game.players[playerIndex].inventory === undefined) {
           game.players[playerIndex].inventory = [];
       }
       game.players[playerIndex].inventory.push(object);

       //  Now pay!
       if (handlerResp.data && handlerResp.data.payment && handlerResp.data.payment.type) {
           for (var i=0; i<game.players[playerIndex].inventory.length; i++) {
               if (game.players[playerIndex].inventory[i].type === handlerResp.data.payment.type) {
                  currentLocation.characters[characterInfo.characterIndex].inventory.push(game.players[playerIndex].inventory[i]);
                  game.players[playerIndex].inventory.splice(i, 1);
                  break;
               }
           }
       }

       // We don't need to send the updated target on to the client.
       // Instead we'll send the updated game and mapLocation.
       handlerResp.data = {};

       async.waterfall([
           function updateGame(validationCallback) {
               Game.update(
                  {id: game.id},
                   game).exec(function(err, updatedGame) {
                     sails.log.info("buy from() Game.update() callback");
                     if (err) {
                        sails.log.info("buy from() Game.update() callback, error. " + err);
                        validationCallback("Failed to save the game");
                     } else {
                        sails.log.info("buy from() Game.update() callback, no error.");
                        if (updatedGame) {
                           sails.log.info("buy from() Game.update() callback " + JSON.stringify(updatedGame));
                           validationCallback(null, updatedGame);
                        } else {
                           sails.log.info("buy from() Game.update() callback, game is null.");
                           validationCallback("Failed to save the game");
                        }
                     }
               });
           },
           function updateMapLocation(updatedGame, validationCallback) {
               MapLocation.update(
                   {id: currentLocation.id},
                   currentLocation).exec(function(err, updatedLocation) {
                   sails.log.info("in MapLocation.update() callback");
                   if (err) {
                       sails.log.info("in MapLocation.update() callback, error. " + err);
                        validationCallback("Failed to save the maplocation");
                   } else {
                       sails.log.info("in MapLocation.update() callback, no error.");
                       if (updatedLocation) {
                           sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                           validationCallback(null, updatedGame, updatedLocation);
                       } else {
                           sails.log.info("in MapLocation.update() callback, item is null.");
                           validationCallback("Failed to save the maplocation");
                       }
                   }
               });
           }
       ], function (err, updatedGame, updatedLocation) {
           sails.log.info("in buy from() all done. err:" + err);
           sails.log.info("in buy from() all done. updatedGame:" + JSON.stringify(updatedGame));
           sails.log.info("in buy from() all done. updatedLocation:" + JSON.stringify(updatedLocation));
           if (err) {
               statusCallback({error: true, data: updatedGame});
               return;
           }

           handlerResp.data['game'] = updatedGame;
           handlerResp.data['location'] = updatedLocation;
           sails.log.info("*** sending resp: " + JSON.stringify(handlerResp));
           handlerResp.data = {game:updatedGame, location:updatedLocation};
           sails.io.sockets.emit(game.id + "-status", handlerResp);

           statusCallback({error: false, data:handlerResp});
       });
    });
}

function handleDrop(command, game, playerName, statusCallback) {
    var target = command.replace(/drop[\s+]/i, "");

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    sails.log.info("DROP: " + target);

    // Get the current player location.
    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        sails.log.info("in handleTake.find() invalid player.");
        statusCallback({error:true, message:"Invalid player"});
		    return;
    }

    var currentX = parseInt(playerInfo.player.location.x);
    var currentY = parseInt(playerInfo.player.location.y);

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': currentX.toString(), 'y': currentY.toString()}).exec(function(err, currentLocation) {
        sails.log.info("in handleDrop.find() callback");
        if (err) {
            sails.log.info("in handleDrop db err:" + err);
            statusCallback({error:true, message:err});
            return;
        }

        sails.log.info("in handleDrop.find() callback, no error.");
        if (!currentLocation) {
            var errorMessage = "Current location not found";
            sails.log.info("Current location not found");
            statusCallback({error:true, message:errorMessage});
            return;
        }

        sails.log.info("in handleDrop.find() callback " + JSON.stringify(currentLocation));

        // Find the requested item in the inventory.
        var found = false;
        for (var i=0; i<playerInfo.player.inventory.length; i++) {
            // TODO: handle ambiguous object descriptions (e.g. "drop sword" when there are two swords).
            if (playerInfo.player.inventory[i].type !== target) {
               continue;
            }

            found = true;
            var item = playerInfo.player.inventory[i];
            if (undefined === currentLocation.items) {
                currentLocation.items = [];
            }

            currentLocation.items.push(item);
            playerInfo.player.inventory.splice(i, 1);

            if (playerInfo.player.using && _.isEqual(playerInfo.player.using, item)) {
               playerInfo.player.using = [];
            }

            game.players[playerInfo.playerIndex] = playerInfo.player;

            // TODO: serious limitation - waterline doesn't support transactions so
            // if anything below fails the db could be left in an inconsistent state.
            // See if I can implement this myself using the .transaction() interface.
            Game.update(
                {id: game.id},
                game).exec(function(err, updatedGame) {
                sails.log.info("in Game.update() callback");
                if (err) {
                    sails.log.info("in Game.update() callback, error. " + err);
                    statusCallback({error:true, message:err});
                    return;
                }

                sails.log.info("in Game.update() callback, no error.");
                if (!updatedGame) {
                    sails.log.info("in Game.update() callback, item is null.");
                    statusCallback({error:true, message:"failed to find game"});
                    return;
                }

                sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));

                MapLocation.update(
                    {id: currentLocation.id},
                    currentLocation).exec(function(err, updatedLocation) {
                    sails.log.info("in MapLocation.update() callback");
                    if (err) {
                        sails.log.info("in MapLocation.update() callback, error. " + err);
                        statusCallback({error: true, message: err});
                        return;
                    }

                    sails.log.info("in MapLocation.update() callback, no error.");
                    if (!updatedLocation) {
                        sails.log.info("in MapLocation.update() callback, item is null.");
                        statusCallback({error: true, message: "failed to find MapLocation"});
                        return;
                    }

                    sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                    sails.log.info("sending socket messages for subject '" + game.id + "-status'");
                    notifyData = {
                       player: playerName,
                       description: {
                           action: "drop",
                           message: "You have dropped a " + item.type,
                           item: item,
                       },
                       data: {
                           game: updatedGame,
                           location: updatedLocation
                       }
                    };

                    sails.io.sockets.emit(game.id + "-status", notifyData);
                    statusCallback({error: false});
                    return;
                });
            });
        }

        if (!found) {
            var errorMessage = "There is no " + target + ".";
            sails.log.info(errorMessage);
            statusCallback({error:true, message:errorMessage});
            return;
        }
    });
}

function handleGive(command, game, playerName, statusCallback) {
    command = command.replace(/give[\s+]/i, "");
    var commandArgs = command.split("to");

    sails.log.info("GIVE: " + JSON.stringify(commandArgs));
    if (commandArgs.length != 2) {
       sails.log.info("in handleGive() command not in the format \"give object to recipient\".");
       statusCallback({error: true, message: "invalid command"});
       return;
    }

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    var objectName = commandArgs[0].trim();
    var recipientName = commandArgs[1].trim();
    sails.log.info("GIVE: " + objectName + " to " + recipientName);

    // Get the current player location.
    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        sails.log.info("in handleUse.find() invalid player.");
        statusCallback({error:true, message:"Invalid player"});
		    return;
    }

    var currentX = parseInt(game.players[playerInfo.playerIndex].location.x);
    var currentY = parseInt(game.players[playerInfo.playerIndex].location.y);

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': currentX.toString(), 'y': currentY.toString()}).exec(function(err, currentLocation) {
        sails.log.info("in handleGive.find() callback");
        if (err) {
            sails.log.info("in handleGive db err:" + err);
            statusCallback({error:true, message:err});
            return;
        }

        sails.log.info("in handleGive.find() callback, no error.");
        if (!currentLocation) {
            var errorMessage = "Current location not found";
            sails.log.info("Current location not found");
            statusCallback({error:true, message:errorMessage});
            return;
        }

        sails.log.info("in handleGive.find() callback " + JSON.stringify(currentLocation));

        // Find the requested item in the inventory.
        if (game.players[playerInfo.playerIndex].inventory === undefined) {
            sails.log.info("in MapLocation.findOne() callback, item not found.");
            statusCallback({error:true, message:"You do not have an " + objectName});
            return;
        }

        var object = null;
        for (var i = 0; i < game.players[playerInfo.playerIndex].inventory.length; i++) {
            // TODO: handle ambiguous object descriptions (e.g. "give sword..." when there are two swords).
            if (game.players[playerInfo.playerIndex].inventory[i].type === objectName) {
                // Update the player inventory now. If the give operation fails we
                // won't save this change.
                object = game.players[playerInfo.playerIndex].inventory[i];
                game.players[playerInfo.playerIndex].inventory.splice(i, 1);
                break;
            }
        }

        if (object === null) {
            sails.log.info("in MapLocation.findOne() callback, item not found.");
            statusCallback({error:true, message:"You do not have an " + objectName});
            return;
        }

        sails.log.info("Found object: " + JSON.stringify(object));

        // Found the item, now find the recipient.
        var recipient = null;
        var recipientIndex = 0;
        for (var i=0; i<currentLocation.characters.length; i++) {
            if (currentLocation.characters[i].type === recipientName) {
                recipient = currentLocation.characters[i];
                recipientIndex = i;
                break;
            }
        }

        if (recipient === null) {
            sails.log.info("in Game.update() callback, recipient not found.");
            statusCallback({error:true, message:"There is no " + recipientName});
            return;
        }

        sails.log.info("Found recipient: " + JSON.stringify(recipient));

        var path = require('path');
        var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
        var handlerPath =  pathroot + recipient.module + "/" + recipient.filename;
        var module = require(handlerPath);

        // Command handlers are optional.
        if (module.handlers === undefined) {
           sails.log.info("Module: " + handlerPath +
                          " does not have a handler for \"give\".");
           statusCallback({error:true, message:"You can't give an " + objectName + " to the " + recipientName});
           return;
        }

        var handlerFunc = module.handlers["give"];
        if (handlerFunc === undefined) {
           sails.log.info("Module: " + handlerPath +
                          " does not have a handler for \"give\".");
           statusCallback({error:true, message:"You can't give an " + objectName + " to the " + recipientName});
           return;
        }

        sails.log.info("calling give()");
        handlerFunc(recipient, object, game, playerName, function(handlerResp) {
           sails.log.info("handlerResp: " + handlerResp);
           if (!handlerResp) {
               sails.log.info("Give failed - null handlerResp");
               statusCallback({error:true, message:"Failed to give an " + objectName + " to the " + recipientName});
               return;
           }

           sails.log.info("Valid handlerResp " + JSON.stringify(handlerResp));
           if (!handlerResp.description.success) {
               sails.log.info("Give failed: " + handlerResp.description.detail);
               statusCallback({error:true, message:handlerResp.description.detail});
               return;
           }

           if (playerInfo.player.using && _.isEqual(playerInfo.player.using, object)) {
              game.players[playerInfo.playerIndex].using = [];
           }

           // Give worked, so update the recipient.
           // Record who gave the object so we can check for "give" objectives.
           object.source = {reason:"give", from:playerName};

           if (recipient.inventory === undefined) {
             recipient.inventory = [];
           }
           recipient.inventory.push(object);
           currentLocation.characters[recipientIndex] = recipient;

           // We don't need to send the updated recipient on to the client.
           // Instead we'll send the updated game and mapLocation.
           handlerResp.data = {};

           async.waterfall([
               function updateGame(validationCallback) {
                   Game.update(
                      {id: game.id},
                       game).exec(function(err, updatedGame) {
                         sails.log.info("give() Game.update() callback");
                         if (err) {
                            sails.log.info("give() Game.update() callback, error. " + err);
                            validationCallback("Failed to save the game");
                         } else {
                            sails.log.info("give() Game.update() callback, no error.");
                            if (updatedGame) {
                               sails.log.info("give() Game.update() callback " + JSON.stringify(updatedGame));
                               validationCallback(null, updatedGame);
                            } else {
                               sails.log.info("Navigate to() Game.update() callback, game is null.");
                               validationCallback("Failed to save the game");
                            }
                         }
                   });
               },
               function updateMapLocation(updatedGame, validationCallback) {
                   MapLocation.update(
                       {id: currentLocation.id},
                       currentLocation).exec(function(err, updatedLocation) {
                       sails.log.info("in MapLocation.update() callback");
                       if (err) {
                           sails.log.info("in MapLocation.update() callback, error. " + err);
                            validationCallback("Failed to save the maplocation");
                       } else {
                           sails.log.info("in MapLocation.update() callback, no error.");
                           if (updatedLocation) {
                               sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                               validationCallback(null, updatedGame, updatedLocation);
                           } else {
                               sails.log.info("in MapLocation.update() callback, item is null.");
                               validationCallback("Failed to save the maplocation");
                           }
                       }
                   });
               },
           ], function (err, updatedGame, updatedLocation) {
               sails.log.info("in give() all done. err:" + err);
               sails.log.info("in give() all done. updatedGame:" + JSON.stringify(updatedGame));
               sails.log.info("in give() all done. updatedLocation:" + JSON.stringify(updatedLocation));
               if (err) {
                   statusCallback({error: true, data: updatedGame});
                   return;
               }

               handlerResp.data['game'] = updatedGame;
               handlerResp.data['location'] = updatedLocation;
               sails.log.info("*** sending resp: " + JSON.stringify(handlerResp));
               handlerResp.data = {game:updatedGame, location:updatedLocation};
               sails.io.sockets.emit(game.id + "-status", handlerResp);

               statusCallback({error: false, data:handlerResp});
           });
        });
    });
}

function handleUse(command, game, playerName, statusCallback) {
    commandArgs = command.replace(/use[\s+]/i, "");

    sails.log.info("Use: " + JSON.stringify(commandArgs));

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    var objectName = commandArgs.trim();

    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        sails.log.info("in handleUse.find() invalid player.");
        statusCallback({error:true, message:"Invalid player"});
		    return;
    }

    // Find the requested item in the inventory.
    var found = false;
    for (var i=0; i<playerInfo.player.inventory.length; i++) {
        // TODO: handle ambiguous object descriptions (e.g. "drop sword" when there are two swords).
        if (playerInfo.player.inventory[i].type !== objectName) {
           continue;
        }

        found = true;
        var item = playerInfo.player.inventory[i];
        playerInfo.player.using = item;
        game.players[playerInfo.playerIndex] = playerInfo.player;

        // TODO: serious limitation - waterline doesn't support transactions so
        // if anything below fails the db could be left in an inconsistent state.
        // See if I can implement this myself using the .transaction() interface.
        Game.update(
            {id: game.id},
            game).exec(function(err, updatedGame) {
            sails.log.info("in Game.update() callback");
            if (err) {
                sails.log.info("in Game.update() callback, error. " + err);
                statusCallback({error:true, message:err});
                return;
            }

            sails.log.info("in Game.update() callback, no error.");
            if (!updatedGame) {
                sails.log.info("in Game.update() callback, item is null.");
                statusCallback({error:true, message:"failed to find game"});
                return;
            }

            sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));

            sails.log.info("sending socket messages for subject '" + game.id + "-status'");
            notifyData = {
               player: playerName,
               description: {
                   action: "use",
                   message: "You are using the " + item.type,
                   item: item,
               },
               data: {
                   game: updatedGame
               }
            };

            sails.io.sockets.emit(game.id + "-status", notifyData);
            statusCallback({error: false});
            return;
        });
    }

    if (!found) {
        var errorMessage = "You do not have a " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }
}

function handleFight(command, game, playerName, statusCallback) {
    command = command.replace(/fight[\s+]/i, "");
    var commandArgs = command.split("for");
    var targetName = commandArgs[0].trim();
    var objectName = null;
    if (commandArgs.length === 1) {
       sails.log.info("FIGHT: " + targetName);
    } else {
       // "fight NPC for sword"
       objectName = commandArgs[1].trim();
       sails.log.info("FIGHT: " + targetName + " for " + objectName);
    }

    // TODO: for now object is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".

    // Get the current player location.
    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        sails.log.info("in handleFight.find() invalid player.");
        statusCallback({error:true, message:"Invalid player"});
		    return;
    }

    var currentX = parseInt(playerInfo.player.location.x);
    var currentY = parseInt(playerInfo.player.location.y);

    // TODO: store the coordinates as int instead of string.
    MapLocation.findOne({'realmId': game.id, 'x': currentX.toString(), 'y': currentY.toString()}).exec(function(err, currentLocation) {
        sails.log.info("in handleFight.find() callback");
        if (err) {
            sails.log.info("in handleFight db err:" + err);
            statusCallback({error:true, message:err});
			      return;
        }

        sails.log.info("in handleFight.find() callback, no error.");
        if (!currentLocation) {
            var errorMessage = "Current location not found";
            sails.log.info("Current location not found");
            statusCallback({error:true, message:errorMessage});
			      return;
        }

        sails.log.info("in handleFight.find() callback " + JSON.stringify(currentLocation));

        if (objectName === null) {
           handleFightNPC(targetName, currentLocation, game, playerName, playerInfo.playerIndex, statusCallback);
        } else {
           handleFightNPCforItem(targetName, objectName, currentLocation, game, playerName, playerInfo.playerIndex, statusCallback);
        }
    });
}

function handleCharacterDeath(characterIndex, currentLocation, game) {
   // The character will drop its inventory.
   var character = currentLocation.characters[characterIndex];
   if (character.inventory !== undefined) {
      for (var i = 0; i < character.inventory.length; i++) {
         currentLocation.items.push(character.inventory[i]);
      }
   }
}

// Fight with no particular objective in mind.
function handleFightNPC(targetName, currentLocation, game, playerName, playerIndex, statusCallback) {
    sails.log.info("In handleFightNPC()");

    // If fighting for an object, find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Found targetName: " + JSON.stringify(targetName));
    sails.log.info("characterIndex: " + characterInfo.characterIndex);

    var path = require('path');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var module = null;
    var handlerFunc = null;

    // Perform the default fight operation and call the optional handler to modify the
    // NPC's behaviour.
    var tryHandlers = [
       pathroot + characterInfo.character.module + "/" + characterInfo.character.filename,
       pathroot + "default/default-handlers.js"
    ];

    for (var i = 0; i < tryHandlers.length; i++) {
        var handlerPath = tryHandlers[i];
        sails.log.info("tryhandlers[" + i + "] = " + handlerPath);
        try {
           module = require(handlerPath);
        } catch(err) {
           sails.log.error(JSON.stringify(err));
           continue;
        }

        if (module.handlers !== undefined && module.handlers["fight"] !== undefined) {
            handlerFunc = module.handlers["fight"];
            sails.log.info("found fight handler");
            break;
        } else {
            sails.log.info("1 Module: " + handlerPath +
                           " does not have a handler for \"fight\".");
        }
    }

    if (!handlerFunc) {
        sails.log.info("There is no handler for \"fight\" available.");
        statusCallback({error:true, message:"There is no handler for \"fight\" available"});
        return;
    }

    sails.log.info("calling fight()");
    handlerFunc(characterInfo.character, null, game, playerName, function(handlerResp) {
       sails.log.info("handlerResp: " + handlerResp);
       if (!handlerResp) {
           sails.log.info("1 fight - null handlerResp");
           statusCallback({error:true, message:"The " + targetName + " won't give you the " + objectName});
           return;
       }

       sails.log.info("Valid handlerResp " + JSON.stringify(handlerResp));
       if (!handlerResp.description.success) {
           sails.log.info("2 fight failed: " + handlerResp.description.detail);
           statusCallback({error:true, message:handlerResp.description.detail});
           return;
       }

       // After the fight, update the game.
       if (handlerResp.data === undefined) {
           sails.log.info("*** 1 sending resp: " + JSON.stringify(handlerResp));
           handlerResp.data = {game:game, location:currentLocation};
           sails.io.sockets.emit(game.id + "-status", handlerResp);
           statusCallback({error: false, data:handlerResp});
           return;
       }

       if (handlerResp.data.player !== undefined) {
           game.players[playerIndex] = handlerResp.data.player;
       }

       if (handlerResp.data.character !== undefined) {
           currentLocation.characters[characterInfo.characterIndex] = handlerResp.data.character;
       }

       if (handlerResp.data.characterDied) {
          handleCharacterDeath(characterInfo.characterIndex, currentLocation, game);
          currentLocation.characters.splice(characterInfo.characterIndex, 1);
       }

       // TODO: what should happen if the player dies? For now the player can't
       // actually die, but should you forfeit your inventory?

       // We don't need to send the updated target on to the client.
       // Instead we'll send the updated game and mapLocation.
       handlerResp.data = {};

       async.waterfall([
           function updateGame(validationCallback) {
               Game.update(
                  {id: game.id},
                   game).exec(function(err, updatedGame) {
                     sails.log.info("fight() Game.update() callback");
                     if (err) {
                        sails.log.info("fight() Game.update() callback, error. " + err);
                        validationCallback("Failed to save the game");
                     } else {
                        sails.log.info("fight() Game.update() callback, no error.");
                        if (updatedGame) {
                           sails.log.info("fight() Game.update() callback " + JSON.stringify(updatedGame));
                           validationCallback(null, updatedGame);
                        } else {
                           sails.log.info("fight() Game.update() callback, game is null.");
                           validationCallback("Failed to save the game");
                        }
                     }
               });
           },
           function updateMapLocation(updatedGame, validationCallback) {
               MapLocation.update(
                   {id: currentLocation.id},
                   currentLocation).exec(function(err, updatedLocation) {
                   sails.log.info("in MapLocation.update() callback");
                   if (err) {
                       sails.log.info("in MapLocation.update() callback, error. " + err);
                        validationCallback("Failed to save the maplocation");
                   } else {
                       sails.log.info("in MapLocation.update() callback, no error.");
                       if (updatedLocation) {
                           sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                           validationCallback(null, updatedGame, updatedLocation);
                       } else {
                           sails.log.info("in MapLocation.update() callback, item is null.");
                           validationCallback("Failed to save the maplocation");
                       }
                   }
               });
           }
       ], function (err, updatedGame, updatedLocation) {
           sails.log.info("in fight() all done. err:" + err);
           sails.log.info("in fight() all done. updatedGame:" + JSON.stringify(updatedGame));
           sails.log.info("in fight() all done. updatedLocation:" + JSON.stringify(updatedLocation));
           if (err) {
               statusCallback({error: true, data: updatedGame});
               return;
           }

           //handlerResp.data['game'] = updatedGame;
           //handlerResp.data['location'] = updatedLocation;
           sails.log.info("*** sending resp: " + JSON.stringify(handlerResp));
           handlerResp.data = {game:updatedGame, location:updatedLocation};
           sails.io.sockets.emit(game.id + "-status", handlerResp);

           statusCallback({error: false, data:handlerResp});
       });
    });
}

// Fight until you beat the NPC and take the object
function handleFightNPCforItem(targetName, objectName, currentLocation, game, playerName, playerIndex, statusCallback) {
    sails.log.info("In handleFightNPC()");

    // If fighting for an object, find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Found targetName: " + JSON.stringify(targetName));

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Checking inventory");
    var itemFound = false;
    var object = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
       if (characterInfo.character.inventory[j].type === objectName) {
		        itemFound = true;
		        object = characterInfo.character.inventory[j];
		        characterInfo.character.inventory.splice(j, 1);
		        sails.log.info("Found item in inventory");
	     }
    }

    if (!itemFound) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        sails.log.info(errorMessage);
        statusCallback({error:true, message:errorMessage});
        return;
    }

    sails.log.info("Found objectName: " + JSON.stringify(characterInfo.character.inventory[j]));
    sails.log.info("characterIndex: " + characterInfo.characterIndex);

    // We found the item. See if we can take it.
    var path = require('path');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var handlerPath =  pathroot + characterInfo.character.module + "/" + characterInfo.character.filename;
    var module = require(handlerPath);

    // Command handlers are optional.
    if (module.handlers === undefined) {
       sails.log.info("1 Module: " + handlerPath +
                      " does not have a handler for \"take from\".");
       statusCallback({error:true, message:"The " + targetName + " won't give you the " + objectName});
       return;
    }

    var handlerFunc = module.handlers["take from"];
    if (handlerFunc === undefined) {
       sails.log.info("2 Module: " + handlerPath +
                      " does not have a handler for \"take from\".");
       statusCallback({error:true, message:"The " + targetName + " won't give you the " + objectName});
       return;
    }

    sails.log.info("calling take from()");
    handlerFunc(characterInfo.character, object, game, playerName, function(handlerResp) {
       sails.log.info("handlerResp: " + handlerResp);
       if (!handlerResp) {
           sails.log.info("1 Take from failed - null handlerResp");
           statusCallback({error:true, message:"The " + targetName + " won't give you the " + objectName});
           return;
       }

       sails.log.info("Valid handlerResp " + JSON.stringify(handlerResp));
       if (!handlerResp.description.success) {
           sails.log.info("2 Take from failed: " + handlerResp.description.detail);
           statusCallback({error:true, message:handlerResp.description.detail});
           return;
       }

       // We don't need to send the updated target on to the client.
       // Instead we'll send the updated game and mapLocation.
       handlerResp.data = {};

       // Take worked, so update the target.
       // Record who we took the object from so we can check for
       // "acquire from" objectives.
       object.source = {reason:"take from", from:targetName};

       if (game.players[playerIndex].inventory === undefined) {
           game.players[playerIndex].inventory = [];
       }
       game.players[playerIndex].inventory.push(object);
       currentLocation.characters[recipientIndex] = character;

       async.waterfall([
           function updateGame(validationCallback) {
               Game.update(
                  {id: game.id},
                   game).exec(function(err, updatedGame) {
                     sails.log.info("take from() Game.update() callback");
                     if (err) {
                        sails.log.info("take from() Game.update() callback, error. " + err);
                        validationCallback("Failed to save the game");
                     } else {
                        sails.log.info("take from() Game.update() callback, no error.");
                        if (updatedGame) {
                           sails.log.info("take from() Game.update() callback " + JSON.stringify(updatedGame));
                           validationCallback(null, updatedGame);
                        } else {
                           sails.log.info("take from() Game.update() callback, game is null.");
                           validationCallback("Failed to save the game");
                        }
                     }
               });
           },
           function updateMapLocation(updatedGame, validationCallback) {
               MapLocation.update(
                   {id: currentLocation.id},
                   currentLocation).exec(function(err, updatedLocation) {
                   sails.log.info("in MapLocation.update() callback");
                   if (err) {
                       sails.log.info("in MapLocation.update() callback, error. " + err);
                        validationCallback("Failed to save the maplocation");
                   } else {
                       sails.log.info("in MapLocation.update() callback, no error.");
                       if (updatedLocation) {
                           sails.log.info("in MapLocation.update() callback " + JSON.stringify(updatedLocation));
                           validationCallback(null, updatedGame, updatedLocation);
                       } else {
                           sails.log.info("in MapLocation.update() callback, item is null.");
                           validationCallback("Failed to save the maplocation");
                       }
                   }
               });
           }
       ], function (err, updatedGame, updatedLocation) {
           sails.log.info("in take from() all done. err:" + err);
           sails.log.info("in take from() all done. updatedGame:" + JSON.stringify(updatedGame));
           sails.log.info("in take from() all done. updatedLocation:" + JSON.stringify(updatedLocation));
           if (err) {
               statusCallback({error: true, data: updatedGame});
               return;
           }

           handlerResp.data['game'] = updatedGame;
           handlerResp.data['location'] = updatedLocation;
           sails.log.info("*** sending resp: " + JSON.stringify(handlerResp));
           handlerResp.data = {game:updatedGame, location:updatedLocation};
           sails.io.sockets.emit(game.id + "-status", handlerResp);

           statusCallback({error: false, data:handlerResp});
       });
    });
}


function checkObjectives(game, playerName) {
   sails.log.info("checkObjectives: " + JSON.stringify(game.objectives));

   for (var i=0; i<game.objectives.length; i++) {
      if (game.objectives[i].completed === "true") {
         continue;
      }

      var objective = game.objectives[i];
      sails.log.info("Evaluating objective " + i + ": " + JSON.stringify(objective));
      var path = require('path');
      var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
      var handlerPath =  pathroot + objective.module + "/" + objective.filename;
      var module = require(handlerPath);
      var handlerFunc = module.handlers[objective.type];
      if (handlerFunc === undefined) {
         sails.log.info("Module: " + handlerPath +
                        " does not have a handler for \"" +
                        objective.type + "\".");
         return;
      }

      sails.log.info("calling " + objective.type + "() with game: " + JSON.stringify(game));
      handlerFunc(objective, game, playerName, function(handlerResp) {
         sails.log.info("handlerResp: " + handlerResp);
         if (!handlerResp) {
            return;
         }

         sails.log.info("Valid handlerResp");
         var id = handlerResp.data.objective.id;
         game.objectives[id] = handlerResp.data.objective;

         Game.update(
            {id: game.id},
             game).exec(function(err, updatedGame) {
               sails.log.info("checkObjectives() Game.update() callback");
               if (err) {
                  sails.log.info("checkObjectives() Game.update() callback, error. " + err);
                  return;
               }

               sails.log.info("checkObjectives() Game.update() callback, no error.");
               if (!updatedGame) {
                  sails.log.info("checkObjectives() Game.update() callback, item is null.");
                  return;
               }

               sails.log.info("checkObjectives() Game.update() callback " + JSON.stringify(updatedGame));
               handlerResp.data['game'] = updatedGame;

               sails.log.info("*** sending resp: " + JSON.stringify(handlerResp));
               sails.io.sockets.emit(
                  updatedGame[0].id + "-status",
                  handlerResp);

               return;
         });
      });
   }
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

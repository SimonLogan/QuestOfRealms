/**
 * QuestRealmController
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

var QuestRealmController = {

    createRealm: function(req, res) {
        var realmName = req.param("name");
        var realmDescription = req.param("description");
        var realmWidth = req.param("width");
        var realmHeight = req.param("height");

        sails.log.info("in createRealm, name = " + realmName);
        QuestRealm.create({
            name: realmName,
            description: realmDescription,
            width: realmWidth,
            height: realmHeight,
            objectives: []}).exec(function(error, realm) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                sails.log.info("created Realm " + realm.name);
                // Send the newly-created realm info back to the caller.
                res.send(realm);
            }
        });
    },

    editRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("in editRealm. id = " + realmId);

        return res.view("questRealm/editRealm", {
            realm: {id: realmId}
        });
    },

    deleteRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("in deleteRealm. id = " + realmId);

        QuestRealm.findOne({id: realmId}).exec(function(err, realm) {
            sails.log.info("in deleteRealm.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.deleteRealm() callback, no error.");
                if (realm) {
                    sails.log.info("in QuestRealm.deleteRealm() callback " + JSON.stringify(realm));
                    // The callback parameter is supplied by the async library so that each
                    // parallel operation can let async know when it has completed.
                    // deleteMaplocations() has its own set of parallel operations.
                    deleteMapLocations(realm, function(err) {
                        // This function will be called when all the parallel operations
                        // have been completed. The "err" parameter will be set if any
                        // operation encountered an error.
                        sails.log.info("deleteRealm, finished parallel. err: " + err);
                        sails.log.info("now delete the realm");
                        QuestRealm.destroy({id: realmId}).exec(function(err, realm) {
                            if (err) {
                                sails.log.info("in deleteRealm.find() callback, error. " + err);
                                res.send(500, { error: "failed to delete realm" });
                            } else {
                                sails.log.info("in deleteRealm.find() callback, success. ");
                                res.send();
                            }
                        });
                    });
                } else {
                    sails.log.info("in QuestRealm.deleteRealm() callback, realm is null.");
                    res.send(404, { error: "realm not Found" });
                }
            }
        });
    },

    saveRealm: function(req, res) {
        var realm = req.param("realm");
        sails.log.info("in saveRealm. realm = " + JSON.stringify(realm));

        if (undefined === realm.objectives) {
            // I don't understand why this is needed. The client side sent
            // objectives: [] but it seems to get stripped out by the time it gets here.
            realm.objectives = [];
        }

        // TODO: removing the last objective and passing [] doesn't update the db.
        QuestRealm.update({id: realm.id}, realm).exec(function(err, updatedRealm) {
            sails.log.info("in QuestRealm.update() callback");
            if (err) {
                sails.log.info("in QuestRealm.update() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.update() callback, no error.");
                if (updatedRealm) {
                    sails.log.info("in QuestRealm.update() callback " + JSON.stringify(updatedRealm));
                    res.send(updatedRealm[0]);
                } else {
                    sails.log.info("in QuestRealm.update() callback, item is null.");
                    res.send(404, { error: "realm not Found" });
                }
            }
        });
    },

    // Load a single realm, by Id.
    fetchRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("in fetchRealm. id = " + realmId);

        // Find the QuestRealm object that has the id value matching the specified realmId.
        // If you want to check this in the db, use
        //   use QuestOfRealms
        //   db.questrealm.find({id: ObjectId('56d1d4ed3f5a79642a3ac0eb')});
        QuestRealm.findOne({id: realmId}).exec(function(err, realm) {
            sails.log.info("in QuestRealm.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.findById() callback, no error.");
                if (realm) {
                    sails.log.info("in QuestRealm.findById() callback " + JSON.stringify(realm));
                    res.send(realm);
                } else {
                    sails.log.info("in QuestRealm.findById() callback, realm is null.");
                    res.send(404, { error: "realm not Found" });
                }
            }
        });
    },

    // Load all realms.
    fetchRealms: function(req, res) {
        sails.log.info("in fetchRealms");
        QuestRealm.find().exec(function(err, items) {
            sails.log.info("in QuestRealm.find() callback");
            if (err) {
                sails.log.info("in QuestRealm.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.find() callback, no error.");
                if (items) {
                    sails.log.info("in QuestRealm.find() callback " + JSON.stringify(items));
                    res.send(items);
                } else {
                    sails.log.info("in QuestRealm.find() callback, item is null.");
                    res.send(404, { error: "item not Found" });
                }
            }
        });
    },

    // Game creation is a fairly complex process. We need to clone all the components of the
    // template realm. Waterline operations (the database interface layer of sails.js) are asynchronous
    // and rely on callback functions to notify when the operation has completed. Since they are
    // asynchronous, you can't easily use a normal sequential flow of steps, and it's very easy to
    // get into the Javascript situation known as "callback hell".
    // The async library provides useful constructs for dealing with asynchronous operations.
    createGame: function(req, res) {
        var gameName = req.param("name");
        var gameDescription = req.param("description");
        var playerName = req.param("playerName");
        var parentRealmId = req.param("parentRealmId");

        sails.log.info("in createGame, name:" + gameName + ", playerName:" + playerName);

        async.waterfall([
            // Check the pre-requisites.
            function validation(validationCallback) {
                QuestRealm.findOne({id: parentRealmId}).exec(function (err, realm) {
                    sails.log.info("in QuestRealm.findById() callback");
                    if (err) {
                        validationCallback("createTheGame db err:" + err);
                    } else {
                        sails.log.info("in QuestRealm.findById() callback, no error.");
                        if (realm) {
                            sails.log.info("in QuestRealm.findById() callback " + JSON.stringify(realm));

                            // The realm must have at least a "start at" objective before a game can be created.
                            // Since this is the first objective you must create, it should be sufficient to
                            // check for the existence of any objectives[]
                            if (realm.objectives === undefined ||
                                realm.objectives.length === 0){
                                sails.log.info("in QuestRealm.findById() callback, no \"start at\" objective set.");
                                validationCallback("createTheGame : no \"start at\" objective set");
                            }
                            else {
                                // Everything is ok.
                                validationCallback(null, realm);
                            }
                        } else {
                            sails.log.info("in QuestRealm.findById() callback, realm is null.");
                            validationCallback("createTheGame realm not Found");
                        }
                    }
                });
            },
            function findOrCreatePlayer(realm, playerCallback) {
                sails.log.info("starting findOrCreatePlayer.");
                sails.log.info("realm: " + JSON.stringify(realm));
                // Add the player to the global list of players (for possible
                // use across games, recording high-scores etc.
                var player;
                Player.findOrCreate(
                    {name: playerName},
                    {name: playerName}).exec(function(error, dbPlayer) {
                    if (error) {
                        sails.log.error("DB Error:" + error);
                        playerCallback("findOrCreatePlayer db err:" + err);
                    }

                    sails.log.info("found player " + JSON.stringify(dbPlayer));
                    playerCallback(null, realm, dbPlayer);
                });
            },
            function createTheGame(realm, player, gameCallback) {
                sails.log.info("starting createTheGame.");
                sails.log.info("realm: " + JSON.stringify(realm));
                sails.log.info("player: " + JSON.stringify(player));

                var startx = realm.objectives[0].params[0].value;
                var starty = realm.objectives[0].params[1].value;
                var visitedKey = startx + "_" + starty;
                var playerData = [{
                    name: playerName,
                    location: {x: startx, y: starty},
                    inventory: [],
                    mapDrawMode: "autoVisited",
                    visited: {}}];
                playerData[0].visited[visitedKey] = true;

                // Generate the game.
                var game = {
                    name: gameName,
                    description: gameDescription,
                    parentRealmId: realm.id,
                    width: realm.width,
                    height: realm.height,
                    objectives: realm.objectives,
                    players: playerData};

                Game.create(game).exec(function (error, newGame) {
                    if (error) {
                        sails.log.error("DB Error:" + error);
                        gameCallback("createTheGame db err:" + error);
                    } else {
                        copyMapLocations(newGame, parentRealmId, function() {
                            gameCallback(null, newGame);
                        });
                    }
                });
            }
        ], function (err, result) {
            sails.log.info("in createGame() all done. err:" + err + " result:" + JSON.stringify(result));
            if (err)
                res.send(500, {error: err});
            else
                res.send(result);
        });
    },

    deleteGame: function(req, res) {
        var gameId = req.param("id");
        sails.log.info("in deleteGame. id = " + gameId);

        Game.findOne({id: gameId}).exec(function(err, game) {
            sails.log.info("in deleteGame.findById() 1 callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.deleteGame() callback, no error.");
                if (game) {
                    sails.log.info("in QuestRealm.deleteGame() callback " + JSON.stringify(game));

                     // deleteMaplocations() has its own set of parallel operations.
                     deleteMapLocations(game, function(err) {
                         // This function will be called when all the parallel operations
                         // have been completed. The "err" parameter will be set if any
                         // operation encountered an error.
                         sails.log.info("deleteGame, finished parallel. err: " + err);
                         sails.log.info("now delete the game");
                         Game.destroy({id: gameId}).exec(function (err, game) {
                             if (err) {
                                 sails.log.info("in deleteGame.find() callback, error. " + err);
                                 res.send(500, {error: "failed to delete game"});
                             } else {
                                 sails.log.info("in deleteGame.find() callback, success. ");
                                 res.send();
                             }
                         });
                     });
                } else {
                    sails.log.info("in QuestRealm.deleteGame() callback, realm is null.");
                    res.send(404, { error: "game not Found" });
                }
            }
        });
    },

    saveGame: function(req, res) {
        var game = req.param("gameData");
        sails.log.info("in saveGame. game = " + JSON.stringify(game));

        Game.update({id: game.id}, game).exec(function(err, updatedGame) {
            sails.log.info("in Game.update() callback");
            if (err) {
                sails.log.info("in Game.update() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in Game.update() callback, no error.");
                if (updatedGame) {
                    sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));
                    res.send(updatedGame[0]);
                } else {
                    sails.log.info("in Game.update() callback, item is null.");
                    res.send(404, { error: "game not Found" });
                }
            }
        });
    },

    // Load a single game, by Id.
    fetchGame: function(req, res) {
        var gameId = req.param("id");
        sails.log.info("in fetchGame. id = " + gameId);
        sails.log.info("in fetchGame. sails.NPC = " + JSON.stringify(sails.NPC));
        // Find the Game object that has the id value matching the specified realmId.
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
                    res.send(game);
                } else {
                    sails.log.info("in Game.findById() callback, realm is null.");
                    res.send(404, { error: "game not Found" });
                }
            }
        });
    },

    fetchGames: function(req, res) {
        sails.log.info("in fetchGames");

        Game.find().exec(function(err, games) {
            sails.log.info("in fetchGames.find() callback");
            if (err) {
                sails.log.info("in fetchGames.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in fetchGames.find() callback, no error.");
                if (games) {
                    sails.log.info("in fetchGames.find() callback " + JSON.stringify(games));
                    res.send(games);
                } else {
                    sails.log.info("in fetchGames.find() callback, item is null.");
                    res.send(404, { error: "game not Found" });
                }
            }
        });
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to QuestRealmController)
   */
  _config: {}
};

function deleteMapLocations(realm, locationsDeletedCallback) {
    sails.log.info("in deleteMaplocations. realm = " + JSON.stringify(realm));
    MapLocation.find({realmId: realm.id}).exec(function(err, locations) {
        sails.log.info("in deleteMaplocations.find() 1 callback");
        if (err) {
            sails.log.info("in deleteMaplocations.find() 2 callback, error. " + err);
            locationsDeletedCallback("in deleteMaplocations.find() callback, error. " + err);
        } else {
            sails.log.info("in deleteMaplocations.find() 3 callback, no error.");
            var result = true;
            if (locations) {
                sails.log.info("in deleteMaplocations.find() 4 locations: " + JSON.stringify(locations));
                // Async will iterate over all the entries in locations, calling the function
                // below for each. When all have been marked complete, call locationsCopiedCallback
                // to let async know we are finished.
                async.each(locations, function(location, locationCallback) {
                    sails.log.info("delete location: " + JSON.stringify(location));
                    MapLocation.destroy({id: location.id}).exec(function(err, deletedLocation) {
                        if (err) {
                            sails.log.info("in deleteMapLocation.find() callback, error. " + err);
                            locationCallback(err);
                        } else {
                            sails.log.info("in deleteMapLocation.find() callback, success. ");
                            locationCallback();
                        }
                    });
                },
                function(err) {
                    sails.log.info("finished deleteMaplocations. err: " + err);
                    locationsDeletedCallback(err);
                });
            } else {
                sails.log.info("in deleteMaplocations.find() callback,9  none found.");
                locationsDeletedCallback();
                // It's ok for there to be none.
            }
        }
    });
}

function copyMapLocations(game, parentRealmId, locationsCopiedCallback) {
    sails.log.info("in copyMapLocations. game.id = " + game.id + ", parentRealmId = " + parentRealmId);

    MapLocation.find({realmId: parentRealmId}).exec(function(err, locations) {
        sails.log.info("in copyMapLocations.find() callback");
        if (err) {
            sails.log.info("in copyMapLocations.find() callback, error. " + err);
            locationsCopiedCallback("in copyMapLocations.find() callback, error. " + err);
        } else {
            sails.log.info("in copyMapLocations.find() callback, no error.");
            if (locations) {
                sails.log.info("in copyMapLocations.find() locations: " + JSON.stringify(locations));
                // Async will iterate over all the entries in locations, calling the function
                // below for each. When all have been marked complete, call locationsCopiedCallback
                // to let async know we are finished.
                async.each(locations, function(location, locationCallback) {
                        sails.log.info("copy location: " + JSON.stringify(location));
                        copyMapLocation(game, location, locationCallback);
                    },
                    function(err) {
                        sails.log.info("finished copyMapLocations. err: " + err);
                        locationsCopiedCallback(err);
                    });
            } else {
                sails.log.info("in copyMapLocations.find() callback, none found.");
                locationsCopiedCallback();
                // Should this be an error? No point in creating a game with no locations.
            }
        }
    });
}

function copyMapLocation(game, location, locationCallback) {
    sails.log.info("starting copyMapLocation " + JSON.stringify(location));

    var characters = location.characters;

    MapLocation.create({
        realmId: game.id,
        x: location.x,
        y: location.y,
        type: location.type,
        module: location.module,
        items: location.items,
        characters: characters}).exec(function(error, newLocation) {
        if (error) {
            sails.log.error("DB Error:" + error);
            locationCallback("DB Error:" + error);
        } else {
            sails.log.info("cloned maplocation for game " + game.name);
            locationCallback();
        }
    });
}

module.exports = QuestRealmController;

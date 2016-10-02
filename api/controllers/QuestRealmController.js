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

var currentRealm;

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
            height: realmHeight}).done(function(error, realm) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                sails.log.info("created Realm " + realm.name);
                currentRealm = realm;
                // Send the newly-created realm info back to the caller.
                res.send(realm);
            }
        });
    },

    editRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("in editRealm. id = " + realmId);

        // Find the QuestRealm object that has the _id value matching the specified realmId.
        // If you want to check this in the db, use
        //   use QuestOfRealms
        //   db.questrealm.find({'_id': ObjectId('56d1d4ed3f5a79642a3ac0eb')});
        QuestRealm.findOne({'_id': realmId}).done(function(err, realm) {
            sails.log.info("in QuestRealm.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.findById() callback, no error.");
                if (realm) {
                    currentRealm = realm;
                    sails.log.info("in QuestRealm.findById() callback " + JSON.stringify(realm));

                    return res.view("questRealm/editRealm", {
                        realm: {
                            id: realm.id,
                            name: realm.name,
                            width: realm.width,
                            height: realm.height
                        }
                    });
                } else {
                    sails.log.info("in QuestRealm.findById() callback, realm is null.");
                    res.send(404, { error: "realm not Found" });
                }
            }
        });
    },

    deleteRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("in deleteRealm. id = " + realmId);

        QuestRealm.findOne({'_id': realmId}).done(function(err, realm) {
            sails.log.info("in deleteRealm.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.deleteRealm() callback, no error.");
                if (realm) {
                    sails.log.info("in QuestRealm.deleteRealm() callback " + JSON.stringify(realm));
                    // This will perform the deleteMaplocations() and deleteObjectives()
                    // operations in parallel.
                    async.parallel([
                        // The callback parameter is supplied by the async library so that each
                        // parallel operation can let async know when it has completed.
                        function(callback) {
                            // deleteMaplocations() has its own set of parallel operations.
                            deleteMapLocations(realm, callback);
                        },
                        function(callback) {
                            // deleteObjectives() has its own set of parallel operations.
                            deleteObjectives(realm, callback);
                        }
                    ],
                    // This function will be called when all the parallel operations
                    // have been completed. The "err" parameter will be set if any
                    // operation encountered an error.
                    function(err) {
                        sails.log.info("deleteRealm, finished parallel. err: " + err);
                        sails.log.info("now delete the realm");
                        QuestRealm.destroy({'_id': realmId}).exec(function(err, realm) {
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

    fetchRealms: function(req, res) {
        sails.log.info("in fetchRealms");
        QuestRealm.find().done(function(err, items) {
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
            function findStartLocation(foundCallback) {
                sails.log.info("starting findStartLocation");

                // Find where to place the player initially.
                Objective.findOne({'realmId': parentRealmId, 'type': '1'}).done(function(err, objective) {
                    sails.log.info("in Objective.findById() callback");
                    if (err) {
                        foundCallback("findStartLocation db err:" + err);
                    } else {
                        sails.log.info("in Objective.findById() callback, no error.");
                        if (objective) {
                            sails.log.info("in Objective.findById() callback " + JSON.stringify(objective));
                            startx = objective.params[0]['value'];
                            starty = objective.params[1]['value'];
                            foundCallback(null, startx, starty);
                        }
                        else {
                            sails.log.info("no \"start at\" objective found.");
                            foundCallback("no \"start at\" objective found.");
                        }
                    }
                });
            },
            function findOrCreatePlayer(startx, starty, playerCallback) {
                sails.log.info("starting findOrCreatePlayer. startx:" + startx + " starty:" + starty);
                // Add the player to the global list of players (for possible
                // use across games, recording high-scores etc.
                var player;
                Player.findOrCreate(
                    {name: playerName},
                    {name: playerName}).done(function(error, dbPlayer) {
                    if (error) {
                        sails.log.error("DB Error:" + error);
                        playerCallback("findOrCreatePlayer db err:" + err);
                    }

                    sails.log.info("found player " + JSON.stringify(dbPlayer));
                    playerCallback(null, dbPlayer, startx, starty)
                });
            },
            function createTheGame(player, startx, starty, gameCallback) {
                sails.log.info("starting createTheGame. player: " + JSON.stringify(player) + " startx:"+ startx + " starty:" + starty);

                // Look up some additional info from the parent realm.
                QuestRealm.findOne({'_id': parentRealmId}).done(function (err, realm) {
                    sails.log.info("in QuestRealm.findById() callback");
                    if (err) {
                        gameCallback("createTheGame db err:" + err);
                    } else {
                        sails.log.info("in QuestRealm.findById() callback, no error.");
                        if (realm) {
                            sails.log.info("in QuestRealm.findById() callback " + JSON.stringify(realm));

                            // Generate the game.
                            Game.create({
                                name: gameName,
                                description: gameDescription,
                                parentRealmId: parentRealmId,
                                width: realm.width,
                                height: realm.height,
                                players: [{name: playerName}]
                            }).done(function (error, game) {
                                if (error) {
                                    sails.log.error("DB Error:" + error);
                                    gameCallback("createTheGame db err:" + error);
                                } else {
                                    // This will perform the copyMapLocations() and copyObjectives()
                                    // operations in parallel.
                                    async.parallel([
                                            // The callback parameter is supplied by the async library so that each
                                            // parallel operation can let async know when it has completed.
                                            function (callback) {
                                                // copyMapLocations() has its own set of parallel operations.
                                                copyMapLocations(game, parentRealmId, player, startx, starty, callback);
                                            },
                                            function (callback) {
                                                // copyObjectives() has its own set of parallel operations.
                                                copyObjectives(game, parentRealmId, callback);
                                            }
                                        ],
                                        // This function will be called when all the parallel operations
                                        // have been completed. The "err" parameter will be set if any
                                        // operation encountered an error.
                                        function (err) {
                                            sails.log.info("createGame, finished parallel. err: " + err);
                                            gameCallback(err, game);
                                        }
                                    );
                                }
                            });
                        } else {
                            sails.log.info("in QuestRealm.findById() callback, realm is null.");
                            gameCallback("createTheGame realm not Found");
                        }
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

        Game.findOne({'_id': gameId}).done(function(err, game) {
            sails.log.info("in deleteGame.findById() 1 callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.deleteGame() callback, no error.");
                if (game) {
                    sails.log.info("in QuestRealm.deleteGame() callback " + JSON.stringify(game));
                    // This will perform the deleteMaplocations() and deleteObjectives()
                    // operations in parallel.
                    async.parallel([
                            // The callback parameter is supplied by the async library so that each
                            // parallel operation can let async know when it has completed.
                            function(callback) {
                                // deleteMaplocations() has its own set of parallel operations.
                                deleteMapLocations(game, callback);
                            },
                            function(callback) {
                                // deleteObjectives() has its own set of parallel operations.
                                deleteObjectives(game, callback);
                            }
                        ],
                        // This function will be called when all the parallel operations
                        // have been completed. The "err" parameter will be set if any
                        // operation encountered an error.
                        function(err) {
                            sails.log.info("deleteGame, finished parallel. err: " + err);
                            sails.log.info("now delete the game");
                            Game.destroy({'_id': gameId}).exec(function(err, game) {
                                if (err) {
                                    sails.log.info("in deleteGame.find() callback, error. " + err);
                                    res.send(500, { error: "failed to delete game" });
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

    fetchGames: function(req, res) {
        sails.log.info("in fetchGames");

        Game.find().done(function(err, games) {
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
    MapLocation.find({"realmId": realm.id}).done(function(err, locations) {
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
                    MapLocation.destroy({'_id': location.id}).exec(function(err, deletedLocation) {
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

function copyObjectives(game, parentRealmId, objectivesCopiedCallback) {
    sails.log.info("in copyObjectives. game.id = " + game.id + ", parentRealmId = " + parentRealmId);

    Objective.find({"realmId": parentRealmId}).done(function(err, objectives) {
        sails.log.info("in copyObjectives.find() callback");
        if (err) {
            sails.log.info("in copyObjectives.find() callback, error. " + err);
            objectivesCopiedCallback("in copyObjectives.find() callback, error. " + err);
        } else {
            sails.log.info("in copyObjectives.find() callback, no error.");
            if (objectives) {
                sails.log.info("in copyObjectives.find() objectives: " + JSON.stringify(objectives));
                async.each(objectives, function(objective, objectiveCallback) {
                        sails.log.info("copy objective: " + JSON.stringify(objective));
                        copyObjective(game, objective, objectiveCallback);
                    },
                    function(err) {
                        sails.log.info("finished copyObjectives. err: " + err);
                        objectivesCopiedCallback(err);
                    });
            } else {
                sails.log.info("in copyObjectives.find() callback, none found.");
                objectivesCopiedCallback();
                // Should this be an error? No point in creating a game with no locations.
            }
        }
    });

    sails.log.info("leaving copyObjectives()");
}

function copyObjective(game, objective, objectiveCopiedCallback) {
    sails.log.info("starting copyObjective " + JSON.stringify(objective));
    Objective.create({
        realmId: game.id,
        type: objective.type,
        name: objective.name,
        description: objective.description,
        params: objective.params}).done(function(error, newObjective) {
        // Error or success, call objectiveCopiedCallback to let async know the operation has finished.
        if (error) {
            sails.log.error("DB Error:" + error);
            objectiveCopiedCallback("DB Error:" + error);
        } else {
            sails.log.info("cloned objective for game " + game.name);
            objectiveCopiedCallback();
        }
    });

    return true;
}

function deleteObjectives(realm, objectivesDeletedCallback) {
    sails.log.info("in deleteObjectives. realm = " + JSON.stringify(realm));
    Objective.destroy({'realmId': realm.id}).done(function(err, item) {
        sails.log.info("in deleteObjectives.find() callback");
        if (err) {
            sails.log.info("in deleteObjectives.find() callback, error. " + err);
        } else {
            sails.log.info("in deleteObjectives.find() callback, success. ");
        }

        objectivesDeletedCallback(err);
    });
}

function copyMapLocations(game, parentRealmId, player, startx, starty, locationsCopiedCallback) {
    sails.log.info("in copyMapLocations. game.id = " + game.id + ", parentRealmId = " + parentRealmId);

    MapLocation.find({"realmId": parentRealmId}).done(function(err, locations) {
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
                        copyMapLocation(game, location, player, startx, starty, locationCallback);
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

function copyMapLocation(game, location, player, startx, starty, locationCallback) {
    sails.log.info("starting copyMapLocation " + JSON.stringify(location));

    var characters = location.characters;
    if (location.x === startx && location.y === starty) {
        sails.log.info("copyMapLocation. found start location.");
        characters.push(player);
    }

    MapLocation.create({
        realmId: game.id,
        x: location.x,
        y: location.y,
        environment: location.environment,
        items: location.items,
        characters: characters}).done(function(error, newLocation) {
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

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

    // =============== realm API ===============
    //
    // Realms are building blocks from which to assemble games.
    // Realms can be re-used in different games, and wired together in
    // different orders.

    createRealm: function(req, res) {
        var realmName = req.param("name");
        var realmDescription = req.param("description");
        var realmWidth = req.param("width");
        var realmHeight = req.param("height");

        sails.log.info("********************* in createRealm, name = " + realmName);
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
        var gameId = req.param("gameId");
        sails.log.info("********************* in editRealm. id=" + realmId + ", gameId=" + gameId);

        if (gameId !== undefined) {
           return res.view("questRealm/editRealm", {
               realm: {id: realmId, gameId:gameId}
           });
        }
        else {
           return res.view("questRealm/editRealm", {
               realm: {id: realmId}
           });
        }
    },

    deleteRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("********************* in deleteRealm. id = " + realmId);

        removeRealm(realmId, function(err) {
            if (err) {
                res.send(500, err);
                return;
            }

            sails.log.info("in deleteRealm.find() callback, success. ");
            res.send();
        });
    },

    saveRealm: function(req, res) {
        var realm = req.param("realm");
        sails.log.info("********************* in saveRealm. realm = " + JSON.stringify(realm));

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
        sails.log.info("********************* in fetchRealm. id = " + realmId);

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

    // Load all realms that are not part of a game. These are the realms that
    // can be used as templates for adding realms to a game.
    fetchRealms: function(req, res) {
        sails.log.info("********************* in fetchRealms");
        QuestRealm.find({gameId:undefined}).exec(function(err, items) {
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

    // Check that the specified realm meets the criteria for inclusion in a game:
    // - it must have a valid "start at" objective.
    checkRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("********************* in checkRealm. id = " + realmId);

        async.waterfall([
            // Check the pre-requisites.
            function checkRealmExists(validationCallback) {
                QuestRealm.findOne({id: realmId}).exec(function (err, realm) {
                    sails.log.info("checkRealmExists: QuestRealm.findById() callback");
                    if (err) {
                        validationCallback("createTheGame db err:" + err);
                    } else {
                        sails.log.info("checkRealmExists: QuestRealm.findById() callback, no error.");
                        if (realm) {
                            sails.log.info("checkRealmExists: QuestRealm.findById() callback " + JSON.stringify(realm));
                            // Everything is ok.
                            validationCallback(null, realm);
                        } else {
                            sails.log.info("checkRealmExists: QuestRealm.findById() callback, realm is null.");
                            validationCallback("checkRealm realm not Found");
                        }
                    }
                });
            },
            function checkStartLocation(realm, validationCallback) {
                // The realm must have at least a "start at" objective before a game can be created.
                var startPoint = null;
                for (var i=0; i<realm.objectives.length; i++) {
                    if (realm.objectives[i].type === "Start at") {
                        startPoint = realm.objectives[i];
                        break;
                    }
                }

                if (null === startPoint) {
                    sails.log.info("checkStartLocation: in QuestRealm.findById() callback, no \"start at\" objective set.");
                    validationCallback("No \"start at\" objective set");
                    return;
                }

                sails.log.info("checkStartLocation: searching for id: " + realm.id +
                               " x:" + realm.objectives[i].params[0].value +
                               " y:" + realm.objectives[i].params[1].value);
                MapLocation.findOne(
                    {realmId: realm.id,
                     x: realm.objectives[i].params[0].value,
                     y: realm.objectives[i].params[1].value}).exec(function (err, maplocation) {

                    sails.log.info("checkStartLocation: in MapLocation.findOne() callback");
                    if (err) {
                        validationCallback("checkStartLocation db err:" + err);
                    } else {
                        sails.log.info("checkStartLocation: in MapLocation.findOne() callback, no error.");
                        if (maplocation) {
                            sails.log.info("checkStartLocation: in MapLocation.findOne() callback " + JSON.stringify(maplocation));
                            // Everything is ok.
                            validationCallback(null);
                        } else {
                            sails.log.info("checkStartLocation: in MapLocation.findOne() callback, maplocation is null.");
                            validationCallback("checkStartLocation maplocation not Found");
                        }
                    }
                });
            }
        ], function (err) {
            sails.log.info("in createGame() all done. err:" + err);
            if (err)
                res.send({error: err});
            else
                res.send({});
        });

    },


    // =============== game API ===============
    //
    // Games are templates created from a collection of realms, with ways to
    // navigate between them. Playable game instances can be created from games.
    // Games are kept separate from game instances so that anyone can start
    // a new game by copying a game.

    createGame: function(req, res) {
        var gameName = req.param("name");
        var gameDescription = req.param("description");
        var parentRealmId = req.param("parentRealmId");

        sails.log.info("********************* in createGame, name:" + gameName);

        // Generate the game.
        var game = {
            name: gameName,
            description: gameDescription,
            type: "template",
            realms: []};

        Game.create(game).exec(function (error, newGame) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "createTheGame: db err:" + error});
            } else {
                sails.log.info("Game created ok.");
                res.send(newGame);
            }
        });
    },

    deleteGame: function(req, res) {
        var gameId = req.param("id");
        sails.log.info("********************* in deleteGame. id = " + gameId);

        Game.findOne({id: gameId}).exec(function(err, game) {
            sails.log.info("in deleteGame.findById() 1 callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
                return;
            }

            sails.log.info("in QuestRealm.deleteGame() callback, no error.");
            if (!game) {
                sails.log.info("in QuestRealm.deleteGame() callback, realm is null.");
                res.send(404, { error: "game not Found" });
                return;
            }

            sails.log.info("in QuestRealm.deleteGame() callback " + JSON.stringify(game));

            if (game.realms.length === 0) {
               // Nothing more to do.
               sails.log.info("in QuestRealm.deleteGame(). No realms.");
               removeGame(gameId, function(err) {
                  if (err) {
                      res.send(500, err);
                  } else {
                      res.send();
                  }
               });
               return;
            }

            // The game has realms, so delete them in turn. Each has maplocations
            // which also need to be deleted.
            async.each(game.realms, function(realm, realmDeletedCallback) {
                    sails.log.info("delete realm: " + JSON.stringify(realm));
                    removeRealm(realm.realmId, realmDeletedCallback);
                },
                function(err) {
                    sails.log.info("finished removeRealm. err: " + err);
                    if (err) {
                        sails.log.info("deleteGame(). Error.");
                        res.send(500, err);
                    } else {
                        removeGame(gameId, function(err) {
                           if (err) {
                               res.send(500, err);
                           } else {
                               sails.log.info("deleteGame(). All done.");
                               res.send();
                           }
                        });
                    }
                }
            );
        });
    },

    editGame: function(req, res) {
        var gameId = req.param("id");
        sails.log.info("********************* in editGame. id = " + gameId);

        return res.view("questRealm/editGame", {
            game: {id: gameId}
        });
    },

    // Adding realms to a game is a fairly complex process. We need to clone all the components of the
    // template realm. Waterline operations (the database interface layer of sails.js) are asynchronous
    // and rely on callback functions to notify when the operation has completed. Since they are
    // asynchronous, you can't easily use a normal sequential flow of steps, and it's very easy to
    // get into the Javascript situation known as "callback hell".
    // The async library provides useful constructs for dealing with asynchronous operations.
    //
    // For now I am cloning all the realms to take a snapshot. You could have the game just store
    // the list of realms it needs and postpone the cloning until the game instance creation stage,
    // but this would mean that editing realms referenced by games might break the games (say you removed
    // a portal that was in use in a game).
    updateGameRealms: function(req, res) {
        var gameId = req.param("gameId");
        var realms = req.param("realms");
        if (realms === undefined) {
           // If the client sends an empty array, it appears here as undefined.
           realms = [];
        }
        sails.log.info("in updateGameRealms. gameId=" + gameId + ", realms=" + JSON.stringify(realms));

        // Find the Game object that has the id value matching the specified gameId.
        // If you want to check this in the db, use
        //   use QuestOfRealms
        //   db.game.find({id: ObjectId('56d1d4ed3f5a79642a3ac0eb')});
        Game.findOne({id: gameId}).exec(function(err, game) {
            sails.log.info("in Game.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
                return;
            }

            sails.log.info("in Game.findById() callback, no error.");
            if (!game) {
                sails.log.info("in Game.findById() callback, realm is null.");
                res.send(404, { error: "game not Found" });
			          return;
			      }

            sails.log.info("in Game.findById() callback " + JSON.stringify(game));

            // Compare the client and server realm lists to find updates.
            // Build maps to facilitate client and server list matching.
            var clientPositionMap = {};
            for (var i = 0; i < realms.length; i++) {
               clientPositionMap[realms[i].templateRealmId] = i;
            }
            sails.log.info("clientPositionMap: " + JSON.stringify(clientPositionMap));

            var serverPositionMap = {};
            for (var i = 0; i < game.realms.length; i++) {
               serverPositionMap[game.realms[i].templateRealmId] = i;
            }
            sails.log.info("serverPositionMap: " + JSON.stringify(serverPositionMap));

            var newServerArray = [];
            async.waterfall([
                function addNewPreserveMatches(listMatchCallback) {
                    // Async will iterate over all the entries in realms, calling the function
                    // below for each.
                    async.each(realms,
                        function(clientRealm, clientCheckedCallback) {
                            sails.log.info("Checking client entry " + JSON.stringify(clientRealm));
                            if (!serverPositionMap.hasOwnProperty(clientRealm.templateRealmId)) {
                               // New entry, add it at the current position.
                               sails.log.info("   Adding new");
                               cloneRealm(game.id, clientRealm.templateRealmId, function(newRealmId, error) {
                                  if (error) {
                                      sails.log.info("Failed to create realm: " + err);
                                      clientCheckedCallback({ error: "Failed to create realm: " + err });
                                  } else {
                                      sails.log.info("Created new realm");
                                      newServerArray.push({templateRealmId:clientRealm.templateRealmId, realmId:newRealmId});
                                      clientCheckedCallback(null);
                                  }
                               });
                            } else {
                               sails.log.info("   Adding existing from server index " + serverPositionMap[clientRealm.templateRealmId]);
                               newServerArray.push(game.realms[serverPositionMap[clientRealm.templateRealmId]]);
                               clientCheckedCallback(null);
                            }
                        },
                        function(err) {
                            // When all have been marked complete, call validationCallback
                            // to let async know we are finished.
                            sails.log.info("finished addNewPreserveMatches. err: " + err);
                            listMatchCallback(err);
                        }
                    );
                },
                function deleteNonMatchedServerEntries(listMatchCallback) {
                    sails.log.info("After addNewPreserveMatches, newServerArray: " + JSON.stringify(newServerArray));

                    async.each(game.realms,
                        function(serverRealm, serverCheckedCallback) {
                            sails.log.info("Checking server entry " + JSON.stringify(serverRealm));
                            if (!clientPositionMap.hasOwnProperty(serverRealm.templateRealmId)) {
                               // New entry, delete the server entry.
                               sails.log.info("   Delete server entry");
                               // Delete the server realm
                               removeRealm(serverRealm.realmId, function(err) {
                                   if (err) {
                                       sails.log.info("in deleteNonMatchedServerEntries() error. " + err);
                                       serverCheckedCallback({ error: "Failed to delete server realm: " + err });
                                       return;
                                   }

                                   sails.log.info("in deleteNonMatchedServerEntries() success. ");
                                   serverCheckedCallback(null);
                               });
                            } else {
                               sails.log.info("   Skipping existing from server index " + serverPositionMap[serverRealm.templateRealmId]);
                               serverCheckedCallback(null);
                            }
                        },
                        function(err) {
                            // When all have been marked complete, call validationCallback
                            // to let async know we are finished.
                            sails.log.info("finished addNewPreserveMatches. err: " + err);
                            listMatchCallback(err);
                        }
                    );
                },
                function updateGame(validationCallback) {
                    game.realms = newServerArray;
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
                }
            ], function (err, result) {
                sails.log.info("in createGame() all done. err:" + err + " result:" + JSON.stringify(result));
                if (err)
                    res.send(500, {error: err});
                else
                    res.send(result);
            });
        });
    },

    saveGame: function(req, res) {
        var game = req.param("gameData");
        sails.log.info("********************* in saveGame. game = " + JSON.stringify(game));

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
        sails.log.info("********************* in fetchGame. id = " + gameId);
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

                    // Retrieve basic details of the realms associated with this game.
                    var realmIds = [];
                    for (var x of game.realms) {
                       realmIds.push(x.realmId);
                    }
                    sails.log.info("in Game.findById() game has realmIds " + JSON.stringify(realmIds));
                    if (realmIds.length === 0) {
                        // No realms. Just send the game as-is.
                        res.send(game);
                        return;
                    }

                    QuestRealm.find({id: realmIds}).exec(function(err, realms) {
                        sails.log.info("in QuestRealm.find() callback");
                        if (err) {
                            res.send(500, { error: "DB Error1" + err });
                        } else {
                            sails.log.info("in QuestRealm.find() callback, no error.");
                            if (realms) {
                                sails.log.info("in QuestRealm.find() callback " + JSON.stringify(realms));
                                res.send(game);
                            } else {
                                sails.log.info("in QuestRealm.find() callback, realms is null.");
                                res.send(404, { error: "realms not Found" });
                            }
                        }
                    });
                } else {
                    sails.log.info("in Game.findById() callback, game is null.");
                    res.send(404, { error: "game not Found" });
                }
            }
        });
    },

    fetchGames: function(req, res) {
        sails.log.info("********************* in fetchGames");

        Game.find({"type": "template"}).exec(function(err, games) {
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


    // =============== game instance API ===============
    //
    // A playable game is an instance of a game with players added.
    //

    createGameInstance: function(req, res) {
        var gameName = req.param("name");
        var playerName = req.param("playerName");
        var templateGameId = req.param("templateGameId");

        sails.log.info("********************* in createGameInstance, name: " + gameName +
                       ", playerName: " + playerName +
                       ", templateGameId: " + templateGameId);

        async.waterfall([
            // Check the pre-requisites.
            function checkGameExists(validationCallback) {
                Game.findOne({id: templateGameId}).exec(function (err, templateGame) {
                    sails.log.info("checkGameExists: Game.findById() callback");
                    if (err) {
                        validationCallback("checkGameExists db err:" + err);
                    } else {
                        sails.log.info("checkGameExists: Game.findById() callback, no error.");
                        if (templateGame) {
                            sails.log.info("checkGameExists: Game.findById() callback " + JSON.stringify(templateGame));
                            // Everything is ok.
                            validationCallback(null, templateGame);
                        } else {
                            sails.log.info("checkGameExists: Game.findById() callback, realm is null.");
                            validationCallback("checkGameExists game not Found");
                        }
                    }
                });
            },
            function retrieveFirstRealm(templateGame, validationCallback) {
                // The player will start at the "start at" objective position
                // of the first realm in the game.
                if (templateGame.realms.length === 0) {
                    sails.log.info("in QuestRealm.findById() callback, game has no realms.");
                    validationCallback("Game has no realms");
                    return;
                }

                var realmId = templateGame.realms[0].realmId;
                sails.log.info("retrieveFirstRealm() id=" + realmId);

                QuestRealm.findOne({id: realmId}).exec(function(err, realm) {
                    sails.log.info("in QuestRealm.findById() callback");
                    if (err) {
                        validationCallback({ error: "DB Error1" + err });
                    } else {
                        sails.log.info("in QuestRealm.findById() callback, no error.");
                        if (realm) {
                            sails.log.info("in QuestRealm.findById() callback " + JSON.stringify(realm));
                            validationCallback(null, templateGame, realm);
                        } else {
                            sails.log.info("in QuestRealm.findById() callback, realm is null.");
                            validationCallback({ error: "realm not Found" });
                        }
                    }
                });
            },
            function getStartLocation(templateGame, realm, validationCallback) {
                // The player will start at the "start at" objective position
                // of the first realm in the game.
                var startPoint = null;
                for (var i=0; i<realm.objectives.length; i++) {
                    if (realm.objectives[i].type === "Start at") {
                        startPoint = realm.objectives[i];
                        break;
                    }
                }

                if (null === startPoint) {
                    sails.log.info("checkStartLocation: in QuestRealm.findById() callback, no \"start at\" objective set.");
                    validationCallback("No \"start at\" objective set");
                    return;
                }

                sails.log.info("checkStartLocation: searching for id: " + realm.id +
                               " x:" + realm.objectives[i].params[0].value +
                               " y:" + realm.objectives[i].params[1].value);
                MapLocation.findOne(
                    {realmId: realm.id,
                     x: realm.objectives[i].params[0].value,
                     y: realm.objectives[i].params[1].value}).exec(function (err, maplocation) {

                    sails.log.info("checkStartLocation: in MapLocation.findOne() callback");
                    if (err) {
                        validationCallback("checkStartLocation db err:" + err);
                    } else {
                        sails.log.info("checkStartLocation: in MapLocation.findOne() callback, no error.");
                        if (maplocation) {
                            sails.log.info("checkStartLocation: in MapLocation.findOne() callback " + JSON.stringify(maplocation));
                            // Everything is ok.
                            validationCallback(null, templateGame, {startx:maplocation.x, starty:maplocation.y});
                        } else {
                            sails.log.info("checkStartLocation: in MapLocation.findOne() callback, maplocation is null.");
                            validationCallback("checkStartLocation maplocation not Found");
                        }
                    }
                });
            },
            function findOrCreatePlayer(templateGame, startLocation, playerCallback) {
                sails.log.info("starting findOrCreatePlayer.");
                sails.log.info("templateGame: " + JSON.stringify(templateGame));
                // Add the player to the global list of players (for possible
                // use across games, recording high-scores etc.
                var player;
                Player.findOrCreate(
                    {name: playerName},
                    {name: playerName}).exec(function(error, dbPlayer) {
                    if (error) {
                        sails.log.error("findOrCreatePlayer: DB Error:" + error);
                        playerCallback("findOrCreatePlayer db err:" + err);
                        return;
                    }

                    sails.log.info("findOrCreatePlayer: found player " + JSON.stringify(dbPlayer));
                    playerCallback(null, templateGame, startLocation, dbPlayer);
                });
            },
            function createTheGameInstance(templateGame, startLocation, player, gameCallback) {
                sails.log.info("starting createTheGameInstance.");
                sails.log.info("templateGame: " + JSON.stringify(templateGame));
                sails.log.info("startLocation: " + JSON.stringify(startLocation));
                sails.log.info("player: " + JSON.stringify(player));

                var playerData = [{
                    name: playerName,
                    //location: {x: startLocation.startx, y: startLocation.starty},
                    inventory: [],
                    mapDrawMode: "autoVisited",
                    //visited: {},
                    health: 20,
                    damage:5}];

                // Generate the game.
                var gameInstance = {
                    name: gameName,
                    description: templateGame.description,
                    type: "instance",
                    templateGameId: templateGame.id,
                    realms: [],
                    players: playerData};

                // TODO: decide whether we need this. It may have to move to an
                // earlier stage in the process, perhaps when adding realms to the game.
                /*
                for (var i=0; i<realm.objectives.length; i++) {
                   // Exclude the "start at" objective. That was just a
                   // handy way to indicate the start location.
                   if (realm.objectives[i].type === "Start at") continue;

                   // We need to give the objectives ids because objective evaluation
                   // is ansynchronous and we can't just iterate, updating them sequentially.
                   realm.objectives[i].id = i - 1;
                   game.objectives.push(realm.objectives[i]);
                }
                */

                Game.create(gameInstance).exec(function (error, newGameInstance) {
                    if (error) {
                        sails.log.error("DB Error:" + error);s
                        gameCallback("createTheGame: db err:" + error);
                    } else {
                        // Clone all the realms of the template game.
                        async.each(templateGame.realms,
                            function(templateRealm, realmCreateCallback) {
                                sails.log.info("cloning realm " + JSON.stringify(templateRealm));
                                cloneRealm(newGameInstance.id, templateRealm.realmId, function(newRealmId, error) {
                                    if (error) {
                                        sails.log.info("Failed to create realm: " + err);
                                        realmCreateCallback({ error: "Failed to create realm: " + err });
                                    } else {
                                        sails.log.info("Created new realm: " + JSON.stringify(newRealmId));

                                        // Set the player start location in the first realm.
                                        if (newGameInstance.realms.length === 0) {
                                           newGameInstance.players[0].location = {
                                              realmId: newRealmId, x: startLocation.startx, y: startLocation.starty};
                                           sails.log.info("Set player location to: " + JSON.stringify(newGameInstance.players[0].location));

                                           var visitedKey = startLocation.startx + "_" + startLocation.starty;
                                           sails.log.info("newGameInstance.players[0]: " + JSON.stringify(newGameInstance.players[0]));
                                           newGameInstance.players[0].visited = {};
                                           newGameInstance.players[0].visited[newRealmId] = {};
                                           sails.log.info("newGameInstance.players[0]: " + JSON.stringify(newGameInstance.players[0]));
                                           newGameInstance.players[0].visited[newRealmId][visitedKey] = true;
                                           sails.log.info("newGameInstance.players[0]: " + JSON.stringify(newGameInstance.players[0]));
                                        }

                                        newGameInstance.realms.push({'realmId': newRealmId});
                                        realmCreateCallback(null);
                                    }
                                });
                            },
                            function(err) {
                                // When all have been marked complete, call validationCallback
                                // to let async know we are finished.
                                sails.log.info("finished cloning realms. err: " + err + ", game: " +
                                               JSON.stringify(newGameInstance));

                                // Game instance created ok. Save it to record the realm and location details.
                                Game.update({id: newGameInstance.id}, newGameInstance).exec(function(err, updatedGame) {
                                    sails.log.info("in Game.update() callback");
                                    if (err) {
                                        sails.log.info("in Game.update() callback, error. " + err);
                                        gameCallback({ error: "DB Error1" + err });
                                    } else {
                                        sails.log.info("in Game.update() callback, no error.");
                                        if (updatedGame) {
                                            sails.log.info("in Game.update() callback " + JSON.stringify(updatedGame));
                                            gameCallback(null, updatedGame[0]);
                                        } else {
                                            sails.log.info("in Game.update() callback, item is null.");
                                            gameCallback({ error: "game not Found" });
                                        }
                                    }
                                });
                            }
                        );
                    }
                });
            }
        ], function (err, result) {
            sails.log.info("in createGame() all done. err:" + err + " result:" + JSON.stringify(result));
            if (err) {
                res.send(500, {error: err});
            } else {
                res.send(result);
            }
        });
    },

    fetchGameInstances: function(req, res) {
        sails.log.info("********************* in fetchGameInstancess");

        Game.find({"type": "instance"}).exec(function(err, games) {
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

// Clone a template realm as a game realm, or clone a realm
// of a game when creating a game instance.
function cloneRealm(gameId, templateRealmId, callback) {
    sails.log.info("starting cloneRealm.");

    async.waterfall([
        function findTheRealm(validationCallback) {
            QuestRealm.findOne({id: templateRealmId}).exec(function (err, realm) {
                sails.log.info("checkRealmExists: QuestRealm.findById() callback");
                if (err) {
                    callback("cloneRealm db err:" + err);
                } else {
                    sails.log.info("checkRealmExists: QuestRealm.findById() callback, no error.");
                    if (realm) {
                        sails.log.info("checkRealmExists: QuestRealm.findById() callback " + JSON.stringify(realm));
                        validationCallback(null, realm);
                    } else {
                        sails.log.info("checkRealmExists: QuestRealm.findById() callback, realm is null.");
                        callback("cloneRealm realm not Found");
                    }
                }
            });
        },
        function cloneRealm(templateRealm, validationCallback) {
            var gameRealm = {
                name: templateRealm.name,
                description: templateRealm.description,
                gameId: gameId,
                width: templateRealm.width,
                height: templateRealm.height,
                objectives: templateRealm.objectives};

            QuestRealm.create(gameRealm).exec(function (error, newRealm) {
                if (error) {
                    sails.log.error("DB Error:" + error);
                    validationCallback("cloneRealm: db err:" + error);
                } else {
                    copyMapLocations(newRealm, templateRealm.id, function() {
                        sails.log.info("copied maplocations for new realm: " + JSON.stringify(newRealm.id));
                        validationCallback(null, newRealm.id)
                    });
                }
            });
        }
    ], function (err, newRealmId) {
        sails.log.info("in cloneRealm() all done. err:" + err + " newRealmId:" + JSON.stringify(newRealmId));
        if (err)
            callback(null, err);
        else
            callback(newRealmId, null);
    });
}

function removeGame(gameId, callback) {
    sails.log.info("starting removeGame.");

    Game.destroy({id: gameId}).exec(function(err, game) {
        if (err) {
            sails.log.info("in removeGame() callback, error. " + err);
            callback({ error: "failed to delete game" });
        } else {
            sails.log.info("in removeGame() callback, success. ");
            callback();
        }
    });
}

// Remove a realm and its maplocations.
function removeRealm(realmId, callback) {
    sails.log.info("starting removeRealm.");

    QuestRealm.findOne({id: realmId}).exec(function(err, realm) {
        sails.log.info("in removeRealm.findById() callback");
        if (err) {
            callback({ error: "DB Error1" + err });
            return;
        }

        sails.log.info("in QuestRealm.removeRealm() callback, no error.");
        if (!realm) {
            sails.log.info("in QuestRealm.removeRealm() callback, realm is null.");
            callback({ error: "realm not Found" });
            return;
        }

        sails.log.info("in QuestRealm.removeRealm() callback " + JSON.stringify(realm));
        // The callback parameter is supplied by the async library so that each
        // parallel operation can let async know when it has completed.
        // deleteMaplocations() has its own set of parallel operations.
        deleteMapLocations(realm, function(err) {
            // This function will be called when all the parallel operations
            // have been completed. The "err" parameter will be set if any
            // operation encountered an error.
            sails.log.info("removeRealm, finished parallel. err: " + err);
            sails.log.info("now delete the realm");
            QuestRealm.destroy({id: realmId}).exec(function(err, realm) {
                if (err) {
                    sails.log.info("in removeRealm.find() callback, error. " + err);
                    callback({ error: "failed to delete realm" });
                } else {
                    sails.log.info("in removeRealm.find() callback, success. ");
                    callback();
                }
            });
        });
    });
}

function deleteMapLocations(realm, locationsDeletedCallback) {
    sails.log.info("in deleteMaplocations. realm = " + JSON.stringify(realm));
    MapLocation.find({realmId: realm.id}).exec(function(err, locations) {
        sails.log.info("in deleteMaplocations.find() 1 callback");
        if (err) {
            sails.log.info("in deleteMaplocations.find() 2 callback, error. " + err);
            locationsDeletedCallback("in deleteMaplocations.find() callback, error. " + err);
            return;
        }

        sails.log.info("in deleteMaplocations.find() 3 callback, no error.");
        var result = true;
        if (!locations) {
            sails.log.info("in deleteMaplocations.find() callback,9  none found.");
            locationsDeletedCallback();
            // It's ok for there to be none.
            return;
        }

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
    });
}

function copyMapLocations(game, parentRealmId, locationsCopiedCallback) {
    sails.log.info("in copyMapLocations. game.id = " + game.id + ", parentRealmId = " + parentRealmId);

    MapLocation.find({realmId: parentRealmId}).exec(function(err, locations) {
        sails.log.info("in copyMapLocations.find() callback");
        if (err) {
            sails.log.info("in copyMapLocations.find() callback, error. " + err);
            locationsCopiedCallback("in copyMapLocations.find() callback, error. " + err);
            return;
        }

        sails.log.info("in copyMapLocations.find() callback, no error.");
        if (!locations) {
            sails.log.info("in copyMapLocations.find() callback, none found.");
            locationsCopiedCallback();
            // Should this be an error? No point in creating a game with no locations.
            return;
       }

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
            }
        );
    });
}

function copyMapLocation(realm, location, locationCallback) {
    sails.log.info("starting copyMapLocation " + JSON.stringify(location));

    var characters = location.characters;

    MapLocation.create({
        realmId: realm.id,
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
            sails.log.info("cloned maplocation for realm " + realm.name);
            locationCallback();
        }
    });
}

module.exports = QuestRealmController;

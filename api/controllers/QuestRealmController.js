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

        sails.log.info("in createGame, name =" + gameName +
                       ", playerName =" + playerName);

        // Look up some additional info from the parent realm.
        QuestRealm.findOne({'_id': parentRealmId}).done(function(err, realm) {
            sails.log.info("in QuestRealm.findById() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
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
                        height: realm.height}).done(function(error, game) {
                            if (error) {
                                sails.log.error("DB Error:" + error);
                                res.send(500, {error: "DB Error:" + error});
                            } else {
                                // This will perform the copyMapLocations() and copyObjectives()
                                // operations in parallel.
                                async.parallel([
                                        // The callback parameter is supplied by the async library so that each
                                        // parallel operation can let async know when it has completed.
                                        function(callback) {
                                            // copyMapLocations() has its own set of parallel operations.
                                            copyMapLocations(game, parentRealmId, callback);
                                        },
                                        function(callback) {
                                            // copyObjectives() has its own set of parallel operations.
                                            copyObjectives(game, parentRealmId, callback);
                                        }
                                    ],
                                    // This function will be called when all the parallel operations
                                    // have been completed. The "err" parameter will be set if any
                                    // operation encountered an error.
                                    function(err) {
                                        sails.log.info("createGame, finished parallel. err: " + err);

                                        Objective.findOne({'realmId': parentRealmId, 'type': '1'}).done(function(err, objective) {
                                            sails.log.info("in Objective.findById() callback");
                                            if (err) {
                                                res.send(500, { error: "DB Error1" + err });
                                            } else {
                                                sails.log.info("in Objective.findById() callback, no error.");
                                                if (objective) {
                                                    sails.log.info("in Objective.findById() callback " + JSON.stringify(objective));
                                                    sails.log.info("creating player, name=" + playerName);
                                                    Player.create({
                                                        name: playerName,
                                                        game: game.id,
                                                        // params[0] is { "name" : "x", "value" : "1" }
                                                        // params[1] is { "name" : "y", "value" : "1" }
                                                        location: {'x': objective.params[0]['value'],
                                                                   'y': objective.params[1]['value']}}).done(function(error, player) {
                                                        if (error) {
                                                            sails.log.error("DB Error:" + error);
                                                            res.send(500, {error: "DB Error:" + error});
                                                        }

                                                        sails.log.info("created player " + JSON.stringify(player));
                                                        res.send(game);
                                                     });
                                                }
                                            }
                                        });
                                    }
                                );
                            }
                        });
                } else {
                    sails.log.info("in QuestRealm.findById() callback, realm is null.");
                    res.send(404, { error: "realm not Found" });
                }
            }
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
                    deleteMapLocation(location, locationCallback);
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

function deleteMapLocation(location, locationCallback) {
    sails.log.info("starting deleteMaplocation " + JSON.stringify(location));

    // TODO: deleteItems() and deleteCharacters() functions already exist, so use async.parallel to call them.
    async.parallel([
        function(itemsAndCharactersCallback) {
            deleteItems(location, itemsAndCharactersCallback);
        },
        function(itemsAndCharactersCallback) {
            deleteCharacters(location, itemsAndCharactersCallback);
        }
    ],
    function(err) {
        sails.log.info("Finished deleting items and characters. err: " + err);
        if (err === null)
        {
            sails.log.info("now delete the maplocation");
            MapLocation.destroy({'_id': location.id}).exec(function(err, location) {
                if (err) {
                    sails.log.info("in deleteMapLocation.find() callback, error. " + err);
                } else {
                    sails.log.info("in deleteMapLocation.find() callback, success. ");
                }
            });
        }

        locationCallback(err);
    });
}

function deleteItems(location, callback) {
    sails.log.info("in deleteItems. location = " + JSON.stringify(location));
    var itemIds = [];
    location.items.forEach(function(item) { itemIds.push(item.id); });

    sails.log.info("in deleteItems. itemIds = " + JSON.stringify(itemIds));
    Item.destroy({'_id': itemIds}).exec(function(err, items) {
        if (err) {
            sails.log.info("in deleteItems.find() callback, error. " + err);
        } else {
            sails.log.info("in deleteItems.find() callback, success. ");
        }

        callback(err);
    });
}

function deleteCharacters(location, callback) {
    sails.log.info("in deleteCharacters. location = " + JSON.stringify(location));
    var characterIds = [];
    location.characters.forEach(function(character) {
        characterIds.push(character.id);
    });

    sails.log.info("in deleteCharacters. characterIds = " + JSON.stringify(characterIds));
    Character.destroy({'_id': characterIds}).exec(function(err, characters) {
        if (err) {
            sails.log.info("in deleteCharacters.find() callback, error. " + err);
        } else {
            sails.log.info("in deleteCharacters.find() callback, success. ");
        }
        callback(err);
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
                sails.log.info("in copyObjectives.find() locations: " + JSON.stringify(objectives));
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

function copyMapLocations(game, parentRealmId, locationsCopiedCallback) {
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
    MapLocation.create({
        realmId: game.id,
        x: location.x,
        y: location.y,
        environment: location.environment,
        items: [],
        characters: []}).done(function(error, newLocation) {
            if (error) {
                sails.log.error("DB Error:" + error);
                locationCallback("DB Error:" + error);
            } else {
                sails.log.info("cloned maplocation for game " + game.name);
                // Copy the items and characters in parallel.
                async.parallel([
                    function(itemsAndCharactersCallback) {
                        // async.map() iterates through all the entries in location.items,
                        // passing each in a call to copyItem(), which calls the function
                        // below when it finishes the copy.
                        async.map(location.items, copyItem, function (err, newItems) {
                            // An item has finsihed copying. Call itemsAndCharactersCallback to let
                            // async.map know this. When async.map sees that all items in the collection
                            // have been processed, the parallel operation will marked complete.
                            if (err) {
                                sails.log.error("Failed to clone items for location " +
                                JSON.stringify(location) +
                                ". Error: " + err);
                                itemsAndCharactersCallback(err);
                            } else {
                                sails.log.info("cloned items for location " +
                                JSON.stringify(location) +
                                ". New items: " + JSON.stringify(newItems));
                                newLocation.items = newItems;
                                itemsAndCharactersCallback();
                            }
                        });
                    },
                    function(itemsAndCharactersCallback) {
                        async.map(location.characters, copyCharacter, function (err, newCharacters) {
                            if (err) {
                                sails.log.error("Failed to clone characters for location " +
                                JSON.stringify(location) +
                                ". Error: " + err);
                                itemsAndCharactersCallback(err);
                            } else {
                                sails.log.info("cloned characters for location " +
                                JSON.stringify(location) +
                                ". New characters: " + JSON.stringify(newCharacters));
                                newLocation.characters = newCharacters;
                                itemsAndCharactersCallback();
                            }
                        });
                    }
                ],
                function(err) {
                    sails.log.info("Finished copying maplocation. err: " + err);
                    newLocation.save(function(err, obj) {
                        if (err) {
                            sails.log.info("in copyMapLocation() error saving location: " + err);
                            locationCallback("in copyMapLocation() error saving location: " + err);
                        } else {
                            sails.log.info("in copyMapLocation() saved location: " + JSON.stringify(obj));
                            locationCallback();
                        }
                    });
                });
            }
        });
}

function copyItem(itemRef, itemCallback) {
    sails.log.info("cloning item: " + JSON.stringify(itemRef));

    Item.findOne({"_id": itemRef.id}).done(function(err, item) {
        sails.log.info("in copyItem.find() callback");
        if (err) {
            sails.log.info("in copyItem.find() callback, error. " + err);
            itemCallback("in copyItem.find() callback, error. " + err);
        } else {
            sails.log.info("in copyItem.find() callback, no error.");
            var result = true;
            if (item) {
                sails.log.info("in copyItem.find() item: " + JSON.stringify(item));

                Item.create({
                    name: item.name,
                    type: item.type,
                    description: item.description,
                    damage: item.damage,
                    image: item.image}).done(function(error, newItem) {
                    // Error or success, call itemCallback to let async know the operation has finished.
                    if (error) {
                        sails.log.error("DB Error:" + error);
                        res.send(500, {error: "DB Error:" + error});
                        itemCallback("DB Error:" + error);
                    } else {
                        sails.log.info("cloned item: " + JSON.stringify(newItem));
                        itemCallback(null, {"id": newItem.id});
                    }
                });
            } else {
                sails.log.info("in copyItems.find() callback, none found.");
                itemCallback();
                // Should this be an error? No point in creating a game with no locations.
            }
        }
    });
}

function copyCharacter(characterRef, characterCallback) {
    sails.log.info("cloning character : " + JSON.stringify(characterRef));

    Character.findOne({"_id": characterRef.id}).done(function(err, character) {
        sails.log.info("in copyCharacter.find() callback");
        if (err) {
            sails.log.info("in copyCharacter.find() callback, error. " + err);
            characterCallback("in copyCharacter.find() callback, error. " + err);
        } else {
            sails.log.info("in copyCharacter.find() callback, no error.");
            if (character) {
                sails.log.info("in copyCharacter.find() item: " + JSON.stringify(character));

                Character.create({
                    name: character.name,
                    type: character.type,
                    description: character.description,
                    additionalInfo: character.additionalInfo,
                    damage: character.damage,
                    health: character.health,
                    drops: character.drops,
                    image: character.image}).done(function(error, newCharacter) {
                    // Error or success, call characterCallback to let async know the operation has finished.
                    if (error) {
                        sails.log.error("DB Error:" + error);
                        characterCallback("DB Error:" + error);
                    } else {
                        sails.log.info("cloned character: " + JSON.stringify(newCharacter));
                        characterCallback(null, {"id": newCharacter.id});
                    }
                });
            } else {
                sails.log.info("in copyCharacters.find() callback, none found.");
                characterCallback();
                // Should this be an error? No point in creating a game with no locations.
            }
        }
    });
}

module.exports = QuestRealmController;

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
                res.send(realm);
            }
        });
    },

    editRealm: function(req, res) {
        var realmId = req.param("id");
        sails.log.info("in editRealm. id = " + realmId);

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
                    if (deleteMaplocations(realm)) {
                        if (deleteObjectives(realm)) {
                            QuestRealm.destroy({'_id': realmId}).done(function(err, dummy) {
                                sails.log.info("in delete realm callback");
                                if (err) {
                                    sails.log.info("in delete realm, error. " + err);
                                    res.send(500, { error: "Failed to delete the realm" });
                                } else {
                                    sails.log.info("in delete realm, success. ");
                                    res.send(200, { result: "success" });
                                }
                            });
                        } else {
                            res.send(500, {error: "Failed to delete the realm"});
                        }
                    } else {
                        res.send(500, {error: "Failed to delete the realm"});
                    }
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

    createGame: function(req, res) {
        var gameName = req.param("name");
        var gameDescription = req.param("description");
        var parentRealmId = req.param("parentRealmId");

        sails.log.info("in createGame, name = " + gameName);
        Game.create({
            name: gameName,
            description: gameDescription,
            parentRealmId: parentRealmId}).done(function(error, game) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                async.parallel([
                    function(callback) {
                        copyMapLocations(game, parentRealmId, callback);
                    },
                    function(callback) {
                        copyObjectives(game, parentRealmId, callback);
                    }
                ],
                function(err) {
                    sails.log.info("createGame, finished parallel. err: " + err);
                    res.send(game);
                });
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
                sails.log.info("in QuestRealm.deleteGame() 2 callback, no error.");
                if (game) {
                    sails.log.info("in QuestRealm.deleteGame() 3 callback " + JSON.stringify(game));
                    if (deleteMaplocations(game)) {
                        if (deleteObjectives(game)) {
                            sails.log.info("in QuestRealm.deleteGame() 4 after deleteMapLocations");
                            Game.destroy({'_id': gameId}).done(function (err, dummy) {
                                sails.log.info("game deleted");
                                if (err) {
                                    sails.log.info("in delete game, 5 error. " + err);
                                    res.send(500, {error: "Failed to delete the game"});
                                } else {
                                    sails.log.info("in delete game, 6 success. ");
                                    res.send(200, {result: "success"});
                                }
                            });
                        } else {
                            res.send(500, {error: "Failed to delete the game"});
                        }
                    } else {
                        res.send(500, {error: "Failed to delete the game"});
                    }
                } else {
                    sails.log.info("in QuestRealm.deleteGame() callback, realm is null.");
                    res.send(404, { error: "realm not Found" });
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

function deleteMaplocations(realm) {
    sails.log.info("in deleteMaplocations. realm = " + JSON.stringify(realm));
    MapLocation.find({"realmId": realm.id}).done(function(err, locations) {
        sails.log.info("in deleteMaplocations.find() 1 callback");
        if (err) {
            sails.log.info("in deleteMaplocations.find() 2 callback, error. " + err);
            return false;
        } else {
            sails.log.info("in deleteMaplocations.find() 3 callback, no error.");
            var result = true;
            if (locations) {
                sails.log.info("in deleteMaplocations.find() 4 locations: " + JSON.stringify(locations));
                var locationIds = [];
                locations.forEach(function(location) {
                    sails.log.info("in deleteMaplocations.find() 5 location:  " + JSON.stringify(location));
                    result &= deleteItems(location);
                    result &= deleteCharacters(location);
                    if (result) locationIds.push(location.id);
                });

                if (result) {
                    MapLocation.destroy({'_id': locationIds}).done(function (err, item) {
                        sails.log.info("in deleteMaplocations.find() 6 callback");
                        if (err) {
                            sails.log.info("in deleteMaplocations.find() 7 callback, error. " + err);
                            return false;
                        } else {
                            sails.log.info("in deleteMaplocations.find() 8 callback, success. ");
                        }
                    });
                }
            } else {
                sails.log.info("in deleteMaplocations.find() callback,9  none found.");
                // It's ok for there to be none.
            }
        }
    });

    return true;
}

function deleteItems(location) {
    sails.log.info("in deleteItems. location = " + JSON.stringify(location));
    var itemIds = [];
    location.items.forEach(function(item) {
        sails.log.info("in deleteItems::items.forEach. item = " + JSON.stringify(item));
        itemIds.push(item);
    });

    sails.log.info("in deleteItems. itemIds = " + JSON.stringify(itemIds));
    Item.destroy({'_id': itemIds}).done(function(err, item) {
        sails.log.info("in deleteItems.find() callback");
        if (err) {
            sails.log.info("in deleteItems.find() callback, error. " + err);
            return false;
        } else {
            sails.log.info("in deleteItems.find() callback, success. ");
        }
    });

    return true;
}

function deleteCharacters(location) {
    sails.log.info("in deleteCharacters. location = " + JSON.stringify(location));
    var characterIds = [];
    location.characters.forEach(function(character) {
        sails.log.info("in deleteCharacters::character.forEach. character = " + JSON.stringify(character));
        characterIds.push(character);
    });

    sails.log.info("in deleteCharacters. characterIds = " + JSON.stringify(characterIds));
    Character.destroy({'_id': characterIds}).done(function(err, item) {
        sails.log.info("in deleteCharacters.find() callback");
        if (err) {
            sails.log.info("in deleteCharacters.find() callback, error. " + err);
            return false;
        } else {
            sails.log.info("in deleteCharacters.find() callback, success. ");
        }
    });

    return true;
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

function deleteObjectives(realm) {
    sails.log.info("in deleteObjectives. realm = " + JSON.stringify(realm));
    Objective.destroy({'realmId': realm.id}).done(function(err, item) {
        sails.log.info("in deleteObjectives.find() callback");
        if (err) {
            sails.log.info("in deleteObjectives.find() callback, error. " + err);
            return false;
        } else {
            sails.log.info("in deleteObjectives.find() callback, success. ");
        }
    });

    return true;
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
                async.parallel([
                    function(itemsAndCharactersCallback) {
                        async.map(location.items, copyItem, function (err, newItems) {
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
                    if (error) {
                        sails.log.error("DB Error:" + error);
                        res.send(500, {error: "DB Error:" + error});
                        itemCallback("DB Error:" + error);
                    } else {
                        sails.log.info("cloned item: " + JSON.stringify(newItem));
                        itemCallback(null, newItem.id);
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
                    if (error) {
                        sails.log.error("DB Error:" + error);
                        characterCallback("DB Error:" + error);
                    } else {
                        sails.log.info("cloned character: " + JSON.stringify(newCharacter));
                        characterCallback(null, newCharacter.id);
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

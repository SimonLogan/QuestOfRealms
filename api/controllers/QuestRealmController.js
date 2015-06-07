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

                    return res.view({
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
                    } else
                        res.send(500, { error: "Failed to delete the realm" });
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

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to QuestRealmController)
   */
  _config: {}
};

function deleteMaplocations(realm) {
    sails.log.info("in deleteMaplocations. realm = " + JSON.stringify(realm));
    MapLocation.find({"realmId": realm.id}).done(function(err, locations) {
        sails.log.info("in deleteMaplocations.find() callback");
        if (err) {
            sails.log.info("in deleteMaplocations.find() callback, error. " + err);
            return false;
        } else {
            sails.log.info("in deleteMaplocations.find() callback, no error.");
            var result = true;
            if (locations) {
                sails.log.info("in deleteMaplocations.find() locations: " + JSON.stringify(locations));
                var locationIds = [];
                locations.forEach(function(location) {
                    sails.log.info("in deleteMaplocations.find() location:  " + JSON.stringify(location));
                    result |= deleteItems(location);
                    result |= deleteCharacters(location);
                    if (result) locationIds.push(location.id);
                });

                if (result) {
                    MapLocation.destroy({'_id': locationIds}).done(function (err, item) {
                        sails.log.info("in deleteItems.find() callback");
                        if (err) {
                            sails.log.info("in deleteItems.find() callback, error. " + err);
                            return false;
                        } else {
                            sails.log.info("in deleteItems.find() callback, success. ");
                        }
                    });
                }
            } else {
                sails.log.info("in deleteMaplocations.find() callback, none found.");
                // It's ok for there to be none.
            }
        }
    });

    return true;
}

function deleteItems(location) {
    //sails.log.info("in deleteItems. location = " + JSON.stringify(location));
    var itemIds = [];
    location.items.forEach(function(item) {
        itemIds.push(item.id);
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
    //sails.log.info("in deleteCharacters. location = " + JSON.stringify(location));
    var characterIds = [];
    location.characters.forEach(function(character) {
        characterIds.push(character.id);
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

module.exports = QuestRealmController;

/**
 * CharacterController
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

module.exports = {

    createCharacter: function(req, res) {
        var characterName = req.param("name");
        var characterType = req.param("type");
        var characterDescription = req.param("description");
        var characterAdditionalInfo = req.param("additionalInfo");
        var characterDamage = req.param("damage");
        var characterHealth = req.param("health");
        var characterDrops = req.param("drops");
        var characterImage = req.param("image");
        sails.log.info("in createCharacter, name = " + characterName + ", type = " + characterType);
        Character.create({
            name: characterName,
            type: characterType,
            description: characterDescription,
            additionalInfo: characterAdditionalInfo,
            damage: characterDamage,
            health: characterHealth,
            drops: characterDrops,
            image: characterImage}).done(function(error, item) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                sails.log.info("created character " + JSON.stringify(item));
                res.send(item);
            }
        });
    },

    editCharacter: function(req, res) {
        var characterName = req.param("name");
        var id = req.param("id");
        //var characterType = req.param("type");
        var characterDescription = req.param("description");
        var characterAdditionalInfo = req.param("additionalInfo");
        var characterDamage = req.param("damage");
        var characterHealth = req.param("health");
        var characterDrops = req.param("drops");
        //var characterImage = req.param("image");
        sails.log.info("in editCharacter, name = " + characterName + ", id = " + id);
        Character.find({'_id': id}).done(function(err, character) {
            sails.log.info("in editCharacter.find() callback");
            if (err) {
                sails.log.info("in editCharacter.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in editCharacter.find() callback, no error.");
                if (character) {
                    sails.log.info("in editCharacter.find() callback, " + JSON.stringify(character));
                    character[0].name = characterName;
                    //character[0].type = characterType;
                    character[0].description = characterDescription;
                    character[0].additionalInfo = characterAdditionalInfo;
                    character[0].damage = characterDamage;
                    character[0].health = characterHealth;
                    character[0].drops = characterDrops;
                    //character[0].image = characterImage;
                    character[0].save(function(err) {
                        sails.log.info("after save, " + JSON.stringify(err));
                    });
                    sails.log.info("in editCharacter.find() after edit, " + JSON.stringify(character));
                    res.send(character[0]);
                } else {
                    sails.log.info("in editCharacter.find() callback, item is null.");
                    res.send(404, { error: "character not Found" });
                }
            }
        });
    },

    deleteCharacters: function(req, res) {
        sails.log.info("in deleteCharacters, req.param(\"ids\") = " + req.param("ids"));
        var ids = JSON.parse(req.param("ids"));
        sails.log.info("in deleteCharacters, ids = " + ids);
        Character.destroy({'_id': ids}).done(function(err, character) {
            sails.log.info("in deleteCharacters.find() callback");
            if (err) {
                sails.log.info("in deleteCharacters.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in deleteCharacters.find() callback, no error.");
                if (character) {
                    sails.log.info("in deleteCharacters.find() callback");
                    res.send({success: true});
                } else {
                    sails.log.info("in deleteCharacters.find() callback, item is null.");
                    res.send(404, { error: "character not Found" });
                }
            }
        });
    },

    fetchCharacters: function(req, res) {
        var ids = JSON.parse(req.param("ids"));
        Character.find({"_id": ids}).done(function(err, character) {
            sails.log.info("in Character.find() callback");
            if (err) {
                sails.log.info("in Character.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in Character.find() callback, no error.");
                if (character) {
                    sails.log.info("in Character.find() callback " + JSON.stringify(character));
                    res.send(character);
                } else {
                    sails.log.info("in Character.find() callback, item is null.");
                    res.send(404, { error: "character not Found" });
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

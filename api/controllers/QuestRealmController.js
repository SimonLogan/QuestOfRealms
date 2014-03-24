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
        var realmWidth = req.param("width");
        var realmHeight = req.param("height");

        sails.log.info("in createRealm, name = " + realmName);
        QuestRealm.create({name: realmName, width: realmWidth, height: realmHeight}).done(function(error, realm) {
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
        var realmName = req.param("name");
        sails.log.info("in editRealm. name = " + realmName);

        QuestRealm.findOne({'name': realmName}).done(function(err, realm) {
            sails.log.info("in QuestRealm.findByname() callback");
            if (err) {
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in QuestRealm.findByname() callback, no error.");
                if (realm) {
                    currentRealm = realm;
                    sails.log.info("in QuestRealm.findByname() callback, realm ok. name=" + realm.name +
                                   " width=" + realm.width + " height=" + realm.height);
                    sails.log.info("one");
                    return res.view({
                        realm: {
                            id: realm.id,
                            name: realm.name,
                            width: realm.width,
                            height: realm.height
                        }
                    });
                } else {
                    sails.log.info("in QuestRealm.findByname() callback, realm in null.");
                    res.send(404, { error: "realm not Found" });
                }
            }
        });
    },

    setCellProperties: function(req, res) {
        var realmName = req.param("name");
        var cellData = req.param("cellData");
        sails.log.info("in QuestRealm.setCellProperties. name = " + realmName +
                       ", data = " + cellData);

    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to QuestRealmController)
   */
  _config: {}

  
};

module.exports = QuestRealmController;

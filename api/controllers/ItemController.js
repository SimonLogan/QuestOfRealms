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

    createItem: function(req, res) {
        var itemName = req.param("name");
        var itemType = req.param("type");
        var itemDescription = req.param("description");
        var itemImage = req.param("image");
        var locationId = req.param("locationId");
        sails.log.info("in createItem, name = " + itemName + ", type = " + itemType);
        Item.create({name: itemName,
                     type: itemType,
                     description: itemDescription,
                     image: itemImage,
                     locationId: locationId}).done(function(error, item) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                sails.log.info("created item " + JSON.stringify(item));
                res.send(item);
            }
        });
    },

    editItem: function(req, res) {
        var itemName = req.param("name");
        var id = req.param("id");
        sails.log.info("in editItem, name = " + itemName + ", id = " + id);
        Item.find({'_id': id}).done(function(err, item) {
            sails.log.info("in editItem.find() callback");
            if (err) {
                sails.log.info("in editItem.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in editItem.find() callback, no error.");
                if (item) {
                    sails.log.info("in editItem.find() callback, " + JSON.stringify(item));
                    item[0].name = itemName;
                    item[0].save(function(err) {
                        sails.log.info("after save, " + JSON.stringify(err));
                    });
                    sails.log.info("in editItem.find() after edit, " + JSON.stringify(item));
                    res.send(item[0]);
                } else {
                    sails.log.info("in editItem.find() callback, item is null.");
                    res.send(404, { error: "item not Found" });
                }
            }
        });
    },

    deleteItem: function(req, res) {
        var id = req.param("id");
        sails.log.info("in deleteItem, id = " + id);
        Item.destroy({'_id': id}).done(function(err, item) {
            sails.log.info("in deleteItem.find() callback");
            if (err) {
                sails.log.info("in deleteItem.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in deleteItem.find() callback, no error.");
                if (item) {
                    sails.log.info("in deleteItem.find() callback");
                    res.send({success: true});
                } else {
                    sails.log.info("in deleteItem.find() callback, item is null.");
                    res.send(404, { error: "item not Found" });
                }
            }
        });
    },

    fetchItems: function(req, res) {
        var ids = JSON.parse(req.param("ids"));
        Item.find({"_id": ids}).done(function(err, item) {
            sails.log.info("in Item.find() callback");
            if (err) {
                sails.log.info("in Item.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in Item.find() callback, no error.");
                if (item) {
                    sails.log.info("in Item.find() callback " + JSON.stringify(item));
                    res.send(item);
                } else {
                    sails.log.info("in Item.find() callback, item is null.");
                    res.send(404, { error: "item not Found" });
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
/**
 * Created by Simon on 29/03/2014.
 */

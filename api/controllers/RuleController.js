/**
 * Created by Simon on 28/01/2015.
 */


module.exports = {

    createRule: function(req, res) {
        var itemName = req.param("name");
        var itemType = req.param("type");
        var itemDescription = req.param("description");
        var itemDamage = req.param("damage");
        var itemImage = req.param("image");
        sails.log.info("in createItem, name = " + itemName + ", type = " + itemType);
        Item.create({name: itemName,
            type: itemType,
            description: itemDescription,
            damage: itemDamage,
            image: itemImage}).done(function(error, item) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                sails.log.info("created item " + JSON.stringify(item));
                res.send(item);
            }
        });
    },

    /**
     * Overrides for the settings in `config/controllers.js`
     * (specific to RuleController)
     */
    _config: {}
};
/**
 * Created by Simon on 28/01/2015.
 */

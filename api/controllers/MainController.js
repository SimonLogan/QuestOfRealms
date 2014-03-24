/**
 * MainController
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

var MainController = {

    index: function (req, res) {
        return res.view();
    },

    loadEnvPalette: function(req, res) {
        sails.log.info("in loadEnvPalette");
        var terrainData = [];
        terrainData.push(
            {
                name: "grassland",
                image: "images/grassland.png",
                description: "Grassy plains."
            }
        );

        terrainData.push(
            {
                name: "water",
                image: "images/water.png",
                description: "Lake or ocean. You need a boat to cross this."
            }
        );

        terrainData.push(
            {
                name: "mountains",
                image: "images/mountains.png",
                description: "Not much grows here."
            }
        );

        res.send(terrainData);
    },

    loadItemsPalette: function(req, res) {
        sails.log.info("in loadItemsPalette");
        var itemsData = [];
        itemsData.push(
            {
                name: "spear",
                image: "images/spear.png",
                description: "medium range weapon."
            }
        );

        itemsData.push(
            {
                name: "short sword",
                image: "images/shortsword.png",
                description: "Useful for close-quarters combat. Easily concealed."
            }
        );

        itemsData.push(
            {
                name: "long sword",
                image: "images/longsword.png",
                description: "Useful against more powerful or armoured opponents."
            }
        );

        res.send(itemsData);
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to MainController)
   */
  _config: {}

  
};

module.exports = MainController;
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

//var nomo = require('node-monkey').start({host: "127.0.0.1"});

var MainController = {

    index: function (req, res) {
        return res.view();
    },

    credits: function (req, res) {
        return res.view();
    },

    loadEnvPalette: function(req, res) {
        sails.log.info("in loadEnvPalette");
        var terrainData = [];
        terrainData.push(
            {
                type: "grassland",
                image: "images/grassland.png",
                description: "Grassy plains."
            }
        );

        terrainData.push(
            {
                type: "water",
                image: "images/water2.png",
                description: "Lake or ocean. You need a boat to cross this."
            }
        );

        terrainData.push(
            {
                type: "mountains",
                image: "images/mountains2.png",
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
                type: "spear",
                image: "images/spear.png",
                description: "medium range weapon.",
                damage: 10
            }
        );

        itemsData.push(
            {
                type: "short sword",
                image: "images/shortsword.png",
                description: "Useful for close-quarters combat. Easily concealed.",
                damage: 5
            }
        );

        itemsData.push(
            {
                type: "long sword",
                image: "images/longsword.png",
                description: "Useful against more powerful or armoured opponents.",
                damage: 10
            }
        );

        res.send(itemsData);
    },

    loadCharactersPalette: function(req, res) {
        sails.log.info("in loadCharactersPalette");

        // Use glob-fs to load this data from the plugin-content dir.
        // See file read examples in http://stackoverflow.com/questions/9250851/do-i-need-dependency-injection-in-nodejs-or-how-to-deal-with
        // looks promising: https://darrenderidder.github.io/talks/ModulePatterns/
        var characterData = [];
        characterData.push(
            {
                type: "Giant",
                image: "images/Giant.png",
                description: "Lumbering, stupid humanoids.",
                additional_info: "Can be found herding Iron Boars. Easily killed by Gryphons. They love gold.",
                health: 15,
                damage: 5,
                drops: ["leather"]
            }
        );

        characterData.push(
            {
                type: "Gryphon",
                image: "images/Gryphon.png",
                description: "Graceful, mountable predators.",
                additional_info: "Can be mounted if you bring them a young Iron Boar. Kill Giants - their natural enemies. Can be found in the Globed Forest.",
                health: 50,
                damage: 15,
                drops: ["feathers"]
            }
        );

        characterData.push(
            {
                type: "Iron boar",
                image: "images/IronBoar.png",
                description: "Tough, easily tamed animals.",
                additional_info: "Medium armour. Can be domesticated. Drops iron or gold. Found on Endless plains, and in Utropica. Love to eat Forge Weed.",
                health: 20,
                damage: 5,
                drops: ["iron", "gold"]
            }
        );

        characterData.push(
            {
                type: "night spider",
                image: "images/NightSpider.png",
                description: "Sinister, silent killers.",
                additional_info: "Webs can be made into bow strings. can appear in any realm. can give you sleeping sickness (-1 health per minute when you have it). juveniles can be domesticated to replenish bow strings.",
                health: 3,
                damage: 10,
                drops: ["string", "spider fangs"]
            }
        );

        res.send(characterData);
    },

    loadObjectivesPalette: function(req, res) {
        sails.log.info("in loadObjectivesPalette");
        var objectivesData = [];
        objectivesData.push(
            {
                type: 1,
                name: "Start at",
                description: "Where you start the game.",
                parameters: [
                    {name: "x", type: "int"},
                    {name: "y", type: "int"}
                ]
            }
        );

        objectivesData.push(
            {
                type: 2,
                name: "Navigate to",
                description: "Navigate to a specified map location.",
                parameters: [
                    {name: "x", type: "int"},
                    {name: "y", type: "int"}
                ]
            }
        );

        res.send(objectivesData);
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to MainController)
   */
  _config: {}

};

module.exports = MainController;
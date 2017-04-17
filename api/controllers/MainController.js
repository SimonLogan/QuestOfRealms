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

       var path = require('path');
       var fs = require('fs');
       var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
       var topLevelDirsOrFiles = fs.readdirSync(pathroot);
       for (var index in topLevelDirsOrFiles) {
          var topLevelDirOrFile = path.join(pathroot, topLevelDirsOrFiles[index]);
          var stat = fs.statSync(topLevelDirOrFile);
          if (stat && stat.isDirectory()) {
             var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
             for (var index2 in nextLevelDirsOrFiles) {
                var nextLevelDirOrFile = path.join(topLevelDirOrFile, nextLevelDirsOrFiles[index2]);
                var stat = fs.statSync(nextLevelDirOrFile);
                if (stat && !stat.isDirectory()) {
                   var thisItem = require(nextLevelDirOrFile);
                   if (thisItem.category === "environment" && thisItem.attributes) {
                      // Support defining more than one environment type in the same file.
                      if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                         for (var index3 in thisItem.attributes) {
                            terrainData.push(thisItem.attributes[index3]);
                         }
                      } else {
                         terrainData.push(thisItem.attributes);
                      }
                   }
                }
             }
          }
       }

       res.send(terrainData);
    },

    loadItemsPalette: function(req, res) {
       sails.log.info("in loadItemsPalette");
       var itemData = [];

       var path = require('path');
       var fs = require('fs');
       var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
       var topLevelDirsOrFiles = fs.readdirSync(pathroot);
       for (var index in topLevelDirsOrFiles) {
          var topLevelDirOrFile = path.join(pathroot, topLevelDirsOrFiles[index]);
          var stat = fs.statSync(topLevelDirOrFile);
          if (stat && stat.isDirectory()) {
             var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
             for (var index2 in nextLevelDirsOrFiles) {
                var nextLevelDirOrFile = path.join(topLevelDirOrFile, nextLevelDirsOrFiles[index2]);
                var stat = fs.statSync(nextLevelDirOrFile);
                if (stat && !stat.isDirectory()) {
                   var thisItem = require(nextLevelDirOrFile);
                   if (thisItem.category === "item" && thisItem.attributes) {
                      // Support defining more than one environment type in the same file.
                      if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                         for (var index3 in thisItem.attributes) {
                            itemData.push(thisItem.attributes[index3]);
                         }
                      } else {
                         itemData.push(thisItem.attributes);
                      }
                   }
                }
             }
          }
       }

       res.send(itemData);
    },

    loadCharactersPalette: function (req, res) {
       sails.log.info("in loadCharactersPalette");
       var characterData = [];

       var path = require('path');
       var fs = require('fs');
       var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
       var topLevelDirsOrFiles = fs.readdirSync(pathroot);
       for (var index in topLevelDirsOrFiles) {
          var topLevelDirOrFile = path.join(pathroot, topLevelDirsOrFiles[index]);
          var stat = fs.statSync(topLevelDirOrFile);
          if (stat && stat.isDirectory()) {
             var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
             for (var index2 in nextLevelDirsOrFiles) {
                var nextLevelDirOrFile = path.join(topLevelDirOrFile, nextLevelDirsOrFiles[index2]);
                var stat = fs.statSync(nextLevelDirOrFile);
                if (stat && !stat.isDirectory()) {
                   var thisItem = require(nextLevelDirOrFile);
                   // Don't support defining more than one character type in the same file,
                   // as characters are expected to have complex definitions and the file
                   // may get too big.
                   if (thisItem.category === "character" && thisItem.attributes) {
                      characterData.push(thisItem.attributes);
                   }
                }
             }
          }
       }

       res.send(characterData);
    },

    // Ok to hardcode this.
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

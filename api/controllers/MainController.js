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

    credits: function (req, res) {
        return res.view();
    },

    loadEnvPalette: function(req, res) {
       sails.log.info("in loadEnvPalette");
       var terrainData = {category:'environment', data:[]};

       var path = require('path');
       var fs = require('fs');
       var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
       var topLevelDirsOrFiles = fs.readdirSync(pathroot);
       for (var index in topLevelDirsOrFiles) {
          var topLevelDirOrFile = path.join(pathroot, topLevelDirsOrFiles[index]);
          var stat = fs.statSync(topLevelDirOrFile);
          if (stat && stat.isDirectory()) {
             terrainData['module'] = topLevelDirsOrFiles[index];
             var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
             for (var index2 in nextLevelDirsOrFiles) {
                var nextLevelDirOrFile = path.join(topLevelDirOrFile, nextLevelDirsOrFiles[index2]);
                var stat = fs.statSync(nextLevelDirOrFile);
                if (stat && !stat.isDirectory()) {
                   var thisItem = require(nextLevelDirOrFile);
                   if (thisItem.category === terrainData.category && thisItem.attributes) {
                      // Support defining more than one environment type in the same file.
                      if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                         for (var index3 in thisItem.attributes) {
                            terrainData.data.push(thisItem.attributes[index3]);
                         }
                      } else {
                         terrainData.data.push(thisItem.attributes);
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
       var itemData = {category:'item', data:[]};

       var path = require('path');
       var fs = require('fs');
       var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
       var topLevelDirsOrFiles = fs.readdirSync(pathroot);
       for (var index in topLevelDirsOrFiles) {
          var topLevelDirOrFile = path.join(pathroot, topLevelDirsOrFiles[index]);
          var stat = fs.statSync(topLevelDirOrFile);
          if (stat && stat.isDirectory()) {
             itemData['module'] = topLevelDirsOrFiles[index];
             var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
             for (var index2 in nextLevelDirsOrFiles) {
                var nextLevelDirOrFile = path.join(topLevelDirOrFile, nextLevelDirsOrFiles[index2]);
                var stat = fs.statSync(nextLevelDirOrFile);
                if (stat && !stat.isDirectory()) {
                   var thisItem = require(nextLevelDirOrFile);
                   if (thisItem.category === itemData.category && thisItem.attributes) {
                      // Support defining more than one item type in the same file.
                      if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                         for (var index3 in thisItem.attributes) {
                            itemData.data.push(thisItem.attributes[index3]);
                         }
                      } else {
                         itemData.data.push(thisItem.attributes);
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
       var characterData = {category:'character', data:[]};

       var path = require('path');
       var fs = require('fs');
       var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
       var topLevelDirsOrFiles = fs.readdirSync(pathroot);
       for (var index in topLevelDirsOrFiles) {
          var topLevelDirOrFile = path.join(pathroot, topLevelDirsOrFiles[index]);
          var stat = fs.statSync(topLevelDirOrFile);
          if (stat && stat.isDirectory()) {
             characterData['module'] = topLevelDirsOrFiles[index];
             var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
             for (var index2 in nextLevelDirsOrFiles) {
                var nextLevelDirOrFile = path.join(topLevelDirOrFile, nextLevelDirsOrFiles[index2]);
                var stat = fs.statSync(nextLevelDirOrFile);
                if (stat && !stat.isDirectory()) {
                   var thisItem = require(nextLevelDirOrFile);
                   // Don't support defining more than one character type in the same file,
                   // as characters are expected to have complex definitions and the file
                   // may get too big.
                   if (thisItem.category === characterData.category && thisItem.attributes) {
                      characterData.data.push(thisItem.attributes);
                   }
                }
             }
          }
       }

       res.send(characterData);
    },

    loadObjectivesPalette: function(req, res) {
       sails.log.info("in loadObjectivesPalette");
       var objectiveData = {category:'objective', data:[]};

       var path = require('path');
       var fs = require('fs');
       var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
       var topLevelDirsOrFiles = fs.readdirSync(pathroot);
       for (var index in topLevelDirsOrFiles) {
          var topLevelDirOrFile = path.join(pathroot, topLevelDirsOrFiles[index]);
          var stat = fs.statSync(topLevelDirOrFile);
          if (stat && stat.isDirectory()) {
             objectiveData['module'] = topLevelDirsOrFiles[index];
             var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
             for (var index2 in nextLevelDirsOrFiles) {
                var nextLevelDirOrFile = path.join(topLevelDirOrFile, nextLevelDirsOrFiles[index2]);
                var stat = fs.statSync(nextLevelDirOrFile);
                if (stat && !stat.isDirectory()) {
                   var thisItem = require(nextLevelDirOrFile);
                   if (thisItem.category === objectiveData.category && thisItem.attributes) {
                      // Support defining more than one objectiveData type in the same file.
                      if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                         for (var index3 in thisItem.attributes) {
                            objectiveData.data.push(thisItem.attributes[index3]);
                         }
                      } else {
                         objectiveData.data.push(thisItem.attributes);
                      }
                   }
                }
             }
          }
       }

        res.send(objectiveData);
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to MainController)
   */
  _config: {}

};

module.exports = MainController;

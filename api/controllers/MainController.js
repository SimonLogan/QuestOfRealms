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
       var terrainData = {category:'environment', modules:{}};

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
                   if (thisItem.category === terrainData.category && thisItem.attributes) {
                      //sails.log.info("Got dir: " + topLevelDirOrFile);
                      var thisFile = {"filename":nextLevelDirsOrFiles[index2], "data":[]};

                      // Support defining more than one environment type in the same file.
                      if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                         for (var index3 in thisItem.attributes) {
                            thisFile.data.push(thisItem.attributes[index3]);
                         }
                      } else {
                         thisFile.data.push(thisItem.attributes);
                      }

                      //sails.log.info("Trying to add thisFile: " + JSON.stringify(thisFile));
                      //sails.log.info("terrainData.modules: " + JSON.stringify(terrainData.modules));
                      //sails.log.info("topLevelDirsOrFiles[index]: " + JSON.stringify(topLevelDirsOrFiles[index]));
                      if (!(topLevelDirsOrFiles[index] in terrainData.modules)) {
                          terrainData.modules[topLevelDirsOrFiles[index]] = [];
                      }

                      terrainData.modules[topLevelDirsOrFiles[index]].push(thisFile);
                   }
                }
             }
          }
       }

       res.send(terrainData);
    },

    loadItemsPalette: function(req, res) {
       sails.log.info("in loadItemsPalette");
       var itemData = {category:'item', modules:{}};

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
                   if (thisItem.category === itemData.category && thisItem.attributes) {
                      //sails.log.info("Got dir: " + topLevelDirOrFile);
                      var thisFile = {"filename":nextLevelDirsOrFiles[index2], "data":[]};

                      // Support defining more than one environment type in the same file.
                      if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                         for (var index3 in thisItem.attributes) {
                            thisFile.data.push(thisItem.attributes[index3]);
                         }
                      } else {
                         thisFile.data.push(thisItem.attributes);
                      }

                      //sails.log.info("Trying to add thisFile: " + JSON.stringify(thisFile));
                      //sails.log.info("terrainData.modules: " + JSON.stringify(terrainData.modules));
                      //sails.log.info("topLevelDirsOrFiles[index]: " + JSON.stringify(topLevelDirsOrFiles[index]));
                      if (!(topLevelDirsOrFiles[index] in itemData.modules)) {
                          itemData.modules[topLevelDirsOrFiles[index]] = [];
                      }

                      itemData.modules[topLevelDirsOrFiles[index]].push(thisFile);
                   }
                }
             }
          }
       }

       res.send(itemData);
    },

    loadCharactersPalette: function(req, res) {
       sails.log.info("in loadCharactersPalette");
       var characterData = {category:'character', modules:{}};

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
                   var thisCharacter = require(nextLevelDirOrFile);
                   if (thisCharacter.category === characterData.category && thisCharacter.attributes) {
                      //sails.log.info("Got dir: " + topLevelDirOrFile);
                      var thisFile = {"filename":nextLevelDirsOrFiles[index2], "data":[]};

                      // Don't support defining more than one character type in the same file,
                      // as characters are expected to have complex definitions and the file
                      // may get too big.
                      thisFile.data.push(thisCharacter.attributes);

                      //sails.log.info("Trying to add thisFile: " + JSON.stringify(thisFile));
                      //sails.log.info("terrainData.modules: " + JSON.stringify(terrainData.modules));
                      //sails.log.info("topLevelDirsOrFiles[index]: " + JSON.stringify(topLevelDirsOrFiles[index]));
                      if (!(topLevelDirsOrFiles[index] in characterData.modules)) {
                          characterData.modules[topLevelDirsOrFiles[index]] = [];
                      }

                      characterData.modules[topLevelDirsOrFiles[index]].push(thisFile);
                   }
                }
             }
          }
       }

       res.send(characterData);
    },

    loadObjectivesPalette: function(req, res) {
       sails.log.info("in loadObjectivesPalette");
       var objectiveData = {category:'objective', modules:{}};

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
                   var thisObjective = require(nextLevelDirOrFile);
                   if (thisObjective.category === objectiveData.category && thisObjective.attributes) {
                      //sails.log.info("Got dir: " + topLevelDirOrFile);
                      var thisFile = {"filename":nextLevelDirsOrFiles[index2], "data":[]};

                      // Support defining more than one environment type in the same file.
                      if (Object.prototype.toString.call(thisObjective.attributes) === '[object Array]') {
                         for (var index3 in thisObjective.attributes) {
                            thisFile.data.push(thisObjective.attributes[index3]);
                         }
                      } else {
                         thisFile.data.push(thisObjective.attributes);
                      }

                      //sails.log.info("Trying to add thisFile: " + JSON.stringify(thisFile));
                      //sails.log.info("terrainData.modules: " + JSON.stringify(terrainData.modules));
                      //sails.log.info("topLevelDirsOrFiles[index]: " + JSON.stringify(topLevelDirsOrFiles[index]));
                      if (!(topLevelDirsOrFiles[index] in objectiveData.modules)) {
                          objectiveData.modules[topLevelDirsOrFiles[index]] = [];
                      }

                      objectiveData.modules[topLevelDirsOrFiles[index]].push(thisFile);
                   }
                }
             }
          }
       }

       res.send(objectiveData);
    },

    loadObjectivesPalette_old: function(req, res) {
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
                   var thisObjective = require(nextLevelDirOrFile);
                   if (thisItem.category === objectiveData.category && thisObjective.attributes) {
                      // Support defining more than one objectiveData type in the same file.
                      if (Object.prototype.toString.call(thisObjective.attributes) === '[object Array]') {
                         for (var index3 in thisObjective.attributes) {
                            objectiveData.data.push(thisObjective.attributes[index3]);
                         }
                      } else {
                         objectiveData.data.push(thisObjective.attributes);
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

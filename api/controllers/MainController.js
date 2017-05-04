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


function loadPluginData(category) {
    var pluginData = {category:category, modules:{}};

    var path = require('path');
    var fs = require('fs');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var topLevelDirsOrFiles = fs.readdirSync(pathroot);
    for (var index in topLevelDirsOrFiles) {
       var moduleName = topLevelDirsOrFiles[index];
       var topLevelDirOrFile = path.join(pathroot, moduleName);
       var stat = fs.statSync(topLevelDirOrFile);
       if (stat && stat.isDirectory()) {
          var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
          for (var index2 in nextLevelDirsOrFiles) {
             var filename = nextLevelDirsOrFiles[index2];
             var nextLevelDirOrFile = path.join(topLevelDirOrFile, filename);
             var stat = fs.statSync(nextLevelDirOrFile);
             if (stat && !stat.isDirectory()) {
                var thisItem = require(nextLevelDirOrFile);
                if (thisItem.category === pluginData.category && thisItem.attributes) {
                   var thisFileData = [];

                   // Support defining more than one environment type in the same file.
                   // It is recommended to use one file per character though, to stop the
                   // files becoming too large.
                   if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                      for (var index3 in thisItem.attributes) {
                         thisFileData.push(thisItem.attributes[index3]);
                      }
                   } else {
                      thisFileData.push(thisItem.attributes);
                   }

                   if (!(moduleName in pluginData.modules)) {
                       pluginData.modules[moduleName] = {};
                   }

                   pluginData.modules[moduleName][filename] = thisFileData;
                }
             }
          }
       }
    }

    return pluginData;
 }

 function loadPluginData_old(category) {
    var pluginData = {category:category, modules:{}};

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
                if (thisItem.category === pluginData.category && thisItem.attributes) {
                   var thisFile = {"filename":nextLevelDirsOrFiles[index2], "data":[]};

                   // Support defining more than one environment type in the same file.
                   // It is recommended to use one file per character though, to stop the
                   // files becoming too large.
                   if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                      for (var index3 in thisItem.attributes) {
                         thisFile.data.push(thisItem.attributes[index3]);
                      }
                   } else {
                      thisFile.data.push(thisItem.attributes);
                   }

                   if (!(topLevelDirsOrFiles[index] in pluginData.modules)) {
                       pluginData.modules[topLevelDirsOrFiles[index]] = [];
                   }

                   pluginData.modules[topLevelDirsOrFiles[index]].push(thisFile);
                }
             }
          }
       }
    }

    return pluginData;
 }

var MainController = {

    index: function (req, res) {
        return res.view();
    },

    credits: function (req, res) {
        return res.view();
    },

    loadEnvPalette: function(req, res) {
       sails.log.info("in loadEnvPalette");
       res.send(loadPluginData("environment"));
    },

    loadItemsPalette: function(req, res) {
       sails.log.info("in loadItemsPalette");
       res.send(loadPluginData("item"));
    },

    loadCharactersPalette: function(req, res) {
       sails.log.info("in loadCharactersPalette");
       res.send(loadPluginData("character"));
    },

    loadObjectivesPalette: function(req, res) {
       sails.log.info("in loadObjectivesPalette");
       res.send(loadPluginData("objective"));
    },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to MainController)
   */
  _config: {}

};

module.exports = MainController;

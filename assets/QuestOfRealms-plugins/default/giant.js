/**
 * Created by Simon on 16/04/2017.
 */

module.exports = {

  category: "character",
  attributes: {
    type: "Giant",
    image: "images/Giant.png",
    description: "Lumbering, stupid humanoids.",
    additional_info: "Can be found herding Iron Boars. Easily killed by Gryphons. They love gold.",
    health: 15,
    damage: 5,
    drops: ["leather"]
  },
  handlers: {
       "give": function(giant, object, game, playerName, callback) {
          sails.log.info("*** ");
          sails.log.info("*** in giant.give() " + JSON.stringify(object));
          sails.log.info("*** ");

          resp = {
             player: playerName,
             description: {
                action: "give",
                success: true,
                detail: "The giant took the " + object.type
             }
          };

          sails.log.info("in give() callback value");
          callback(resp);
       },
       "take from": function(giant, object, game, playerName, callback) {
          sails.log.info("*** ");
          sails.log.info("*** in giant.take from() " + JSON.stringify(object));
          sails.log.info("*** ");

          resp = {
             player: playerName,
             description: {
                action: "take from",
                success: false,
                detail: "The giant will not give you the " + object.type
             }
          };

          sails.log.info("in take from() callback value");
          callback(resp);
       }
  }

};


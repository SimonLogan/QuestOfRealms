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

          // Update the giant's inventory.
          if (giant.inventory === undefined) {
             giant.inventory = [];
          }

          // Record who gave the object so we can check for "give" objectives.
          object.source = {reason:"give", from:playerName};

          giant.inventory.push(object);

          resp = {
             player: playerName,
             description: {
                action: "give",
                success: true,
                detail: "The giant took the " + object.type
             },
             data: {recipient: giant}
          };

          sails.log.info("in give() callback value");
          callback(resp);
       }
  }

};


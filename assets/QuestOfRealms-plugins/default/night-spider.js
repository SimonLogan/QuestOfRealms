/**
 * Created by Simon on 16/04/2017.
 */

module.exports = {

  category: "character",
  attributes: {
    type: "night spider",
    image: "images/NightSpider.png",
    description: "Sinister, silent killers.",
    additional_info: "Webs can be made into bow strings. can appear in any realm. can give you sleeping sickness (-1 health per minute when you have it). juveniles can be domesticated to replenish bow strings.",
    health: 3,
    damage: 10,
    drops: ["string", "spider fangs"]
  },
  handlers: {
       "give": function(nightSpider, object, game, playerName, callback) {
          sails.log.info("*** ");
          sails.log.info("*** in nightSpider.give() " + JSON.stringify(object));
          sails.log.info("*** ");

          // The night spider only wants food.
          if (object.type !== "food") {
             resp = {
                player: playerName,
                description: {
                   action: "give",
                   success: false,
                   detail: "The night spider doesn't want the " + object.type
                },
                data: {}
             };

             sails.log.info("in give() callback value");
             callback(resp);
             return;
          }

          // Update the night spider's inventory.
          if (nightSpider.inventory === undefined) {
             nightSpider.inventory = [];
          }

          // Record who gave the object so we can check for "give" objectives.
          object.source = {reason:"give", from:playerName};

          nightSpider.inventory.push(object);

          resp = {
             player: playerName,
             description: {
                action: "give",
                success: true,
                detail: "The night spider took the " + object.type
             },
             data: {recipient: nightSpider}
          };

          sails.log.info("in give() callback value");
          callback(resp);
       }
  }

};


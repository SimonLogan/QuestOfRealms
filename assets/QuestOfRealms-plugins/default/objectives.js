/**
 * Created by Simon on 17/04/2017.
 */

module.exports = {

  category: "objective",
  attributes: [
    {
       name: "Start at",
       description: "Where you start the game.",
       mandatory: true,
       parameters: [
          {name: "x", type: "int"},
          {name: "y", type: "int"}
       ]
    },
    {
       name: "Navigate to",
       description: "Navigate to a specified map location.",
       parameters: [
          {name: "x", type: "int"},
          {name: "y", type: "int"}
       ]
    },
    {
       name: "Acquire item",
       description: "Acquire a particular item.",
       parameters: [
          {name: "item name", type: "string"},
          {name: "number", type: "int"}
       ]
    }
  ],
  handlers: {
       "Navigate to": function(objective, game, playerName, callback) {
          sails.log.info("in Navigate to()");

          sails.log.info("game.players:" + JSON.stringify(game.players));
          for (var i=0; i<game.players.length; i++) {
             if (game.players[i].name !== playerName)
                continue;

             var location = objective.params[0].value + "_" +
                            objective.params[1].value;
             sails.log.info("Looking for location: " + location);
             var visited = game.players[i].visited.hasOwnProperty(location);
             sails.log.info("visited: " + visited);
             if (!visited) {
                sails.log.info("in Navigate to() callback null");
                callback(null);
                return;
             }

             // Mark the objective complete.
             objective.completed = "true";
             resp = {
                player: playerName,
                description: {
                   action: "objective completed"
                },
                data: {
                   objective: objective
                }
             };

             sails.log.info("in Navigate to() callback value");
             callback(resp);
          }
       },
       "Acquire item": function(objective, game, playerName, callback) {
          sails.log.info("in Acquire item()");

          sails.log.info("game.players:" + JSON.stringify(game.players));
          for (var i=0; i<game.players.length; i++) {
             if (game.players[i].name !== playerName)
                continue;

             var object = objective.params[0].value;
             var numRequired = objective.params[1].value;

             sails.log.info("Looking for object: " + object +
                            ", numRequired: " + numRequired);

             if (game.players[i].inventory === undefined) {
                callback(null);
                return;
             }

             var found = 0;
             for (j=0; j<game.players[i].inventory.length; j++) {
                var entry = game.players[i].inventory[j];
                if (entry.type === object)
                   found++;

                if (found === numRequired)
                   break;
             }

             if (found < numRequired) {
                callback(null);
                return;
             }

             // Mark the objective complete.
             objective.completed = "true";
             resp = {
                player: playerName,
                description: {
                   action: "objective completed"
                },
                data: {
                   objective: objective
                }
             };

             sails.log.info("in Acquire item() callback value");
             callback(resp);
          }
       }
  }

};


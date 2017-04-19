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
  ]

};


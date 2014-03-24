/**
 * QuestRealm
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 * @docs		:: http://sailsjs.org/#!documentation/models
 */

module.exports = {

  attributes: {
  	/* e.g.
  	nickname: 'string'
  	*/
      name: {
          type: 'string',
          required: true
      },

      width: {
          type: 'int',
          required: false,
          min: 1,
          max: 50
      },

      height: {
          type: 'int',
          required: false,
          min: 1,
          max: 50
      }
  }

};



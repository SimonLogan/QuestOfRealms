/**
 * Created by Simon on 09/06/2015.
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

        description: {
            type: 'string',
            required: true
        },

        height: {
            type: 'int',
            required: false,
            min: 1,
            max: 50
        }
    }

};
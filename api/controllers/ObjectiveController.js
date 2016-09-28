/**
 * Created by Simon on 07/03/2015.
 */


module.exports = {

    createObjective: function(req, res) {
        var objectiveType = req.param("type");
        var objectiveName = req.param("name");
        var description = req.param("description");
        var realmId = req.param("realmId");
        var params = JSON.parse(req.param("params"));
        sails.log.info("in createObjective, type = " + objectiveType);
        Objective.create({
            type: objectiveType,
            name: objectiveName,
            description: description,
            realmId: realmId,
            params: params}).done(function(error, item) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                sails.log.info("created objective " + JSON.stringify(item));
                res.send(item);
            }
        });
    },

    deleteObjective: function(req, res) {
        var objectiveId = req.param("id");
        sails.log.info("in deleteObjective, id = " + objectiveId);
        Objective.destroy({
            id: objectiveId}).done(function(error, item) {
            if (error) {
                sails.log.error("DB Error:" + error);
                res.send(500, {error: "DB Error:" + error});
            } else {
                sails.log.info("deleted objective " + JSON.stringify(item));
                res.send(item);
            }
        });
    },

    fetchObjectives: function(req, res) {
        var realmId = req.param("realmId");
        Objective.find({"realmId": realmId}).done(function(err, objectives) {
            sails.log.info("in Objective.find(" + realmId + ") callback");
            if (err) {
                sails.log.info("in Objective.find() callback, error. " + err);
                res.send(500, { error: "DB Error1" + err });
            } else {
                sails.log.info("in Objective.find() callback, no error.");
                if (objectives) {
                    sails.log.info("in Objective.find() callback " + JSON.stringify(objectives));
                    res.send(objectives);
                } else {
                    sails.log.info("in Objective.find() callback, item is null.");
                    res.send(404, { error: "objective not Found" });
                }
            }
        });
    },

    /**
     * Overrides for the settings in `config/controllers.js`
     * (specific to ObjectiveController)
     */
    _config: {}
};
/**
 * Created by Simon on 07/03/2015.
 */

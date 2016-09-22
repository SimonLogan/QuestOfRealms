/**
 * Created by Simon on 28/05/16.
 * This file implements the interactions for the game UI.
 */

// Constants

// Global data


// When the page has finished rendering...
$(document).ready(function() {
    // Get the size of the map grid that should be drawn. These values come from the HTML elements
    // with id="realmWidth" and id="realmHeight".
    // The jQuery selectors $(#XXX) below select the elements by id.
    // The data was placed into these elements in the first place by the template parameters
    //    value="<%= realm.width %>"
    //    value="<%= realm.height %>"
    // which get their values from the data passed to the view function by editRealm() in
    // api/controllers/QuestRealmcontroller.js:
    //    return res.view("questRealm/editRealm", {
    //        realm: {
    //            id: realm.id,
    //            name: realm.name,
    //            width: realm.width,
    //            height: realm.height
    //       }
    var realmWidth = parseInt($('#realmWidth').val());
    var realmHeight = parseInt($('#realmHeight').val());
    var realmId = $('#realmId').val(); // Really gameId in this context.

    // Draw the map grid.
    drawMapGrid(realmWidth, realmHeight);
    buildMessageArea();

    // Look into custom namespaces or rooms for the game.
    // Subscribing to a game-specific room means a single server can support multiple games.
    // http://sailsjs.org/documentation/concepts/realtime/on-the-server
    // http://sailsjs.org/documentation/reference/web-sockets/resourceful-pub-sub

    // Backbone is a Model-View-Controller (MVC) framework. Extend the
    // default Model with additional attributes that we need.
    var MapLocationModel = Backbone.Model.extend({
        urlRoot: '/maplocation'
    });

    // Maintain a local collection of map locations. This will be synchronized (both ways)
    // with the server and so allows multi-user access to the data.
    var MapLocationCollection = Backbone.Collection.extend({
        // Extend the default collection with functionality that we need.
        model: MapLocationModel,
        // Socket will be used to automatically synchronize the collection
        // with the server.
        socket: null,
        // Call this function when a synchronization needs to occur.
        sync: function(method, model, options){
            var where = {};
            if (options.where) {
                where = {
                    where: options.where
                }
            }

            this.socket = io.connect();
            this.socket.on("connect", _.bind(function(){
                // https://code.tutsplus.com/tutorials/working-with-data-in-sailsjs--net-31525 says
                // What this means is, you can call any of the HTTP routes through web sockets.
                // So it would be nice to be able to populate the collection through a "get everything"
                // http call:
                //this.socket.request("/getAllGameData", where, _.bind(function(maplocation){
                // But I'm not sure how backbone would synchronize this as the data isn't from a single collection.
                // TODO: check out https://github.com/balderdashy/backbone-to-sails
                this.socket.request("/maplocation", where, _.bind(function(maplocation){
                    this.set(maplocation);
                    console.log("connection");
                }, this));

                // TODO: Don't accept client-side updates to the collection

                // This is the subscription that allows the server to push out collection updates.
                this.socket.on("message", _.bind(function(msg){
                    var m = msg.verb;
                    console.log("collection message, verb: " + m);

                    if (m === "create") {
                        this.add(msg.data);
                    } else if (m === "update") {
                        this.get(msg.data.id).set(msg.data);
                    } else if (m === "destroy") {
                        this.remove(this.get(msg.id));
                    }
                }, this));
            }, this));
        }
    });

    /* Dialogs */

    var locations = new MapLocationCollection();
    // Load the existing data into the collection.
    locations.fetch({ where: { realmId: realmId } });

    //displayObjectives();

    _.templateSettings = {
        interpolate : /\{\{(.+?)\}\}/g
    };

    // Display incoming updates to the Backbone collection.
    var LocationsView = Backbone.View.extend({
        initialize: function () {
            this.listenTo(this.collection, 'add', this.render);
            this.listenTo(this.collection, 'remove', this.remove);
            this.listenTo(this.collection, 'change', this.change);
        },
        render: function(item) {
            if (item != undefined) {
                console.log("in view.render:  " + JSON.stringify(item));

                // Update the local display with the message data.
                var target = $('#mapTable td[id="cell_' + item.attributes.x + '_' + item.attributes.y + '"]').find('div');
                target.attr('data-env', item.attributes.environment);
                target.attr('data-id', item.id);
                target.html('');
                target.append('<img src="images/' + item.attributes.environment + '.png" />');

                // To allow it to be dragged to the wastebasket.
                //target.addClass('draggable mapItem');
                //target.draggable({helper: 'clone', revert: 'invalid'});

                // TODO: draw the player icon
            }
        },
        remove: function(item) {
            console.log("in view.remove: " + JSON.stringify(item));
            var target = $('#mapTable td[id="cell_' + item.attributes.x + '_' + item.attributes.y + '"]').find('div');
            target.html('');

            // To allow it to be dragged to the wastebasket.
            target.removeClass('draggable mapItem');
        },
        change: function(item) {
            console.log("in view.change:  " + JSON.stringify(item));

            // Update the local display with the message data.
            var target = $('#mapTable td[id="cell_' + item.attributes.x + '_' + item.attributes.y + '"]').find('div');
            target.attr('data-env', item.attributes.environment);

            if (item.attributes.startLocation !== undefined) {
                target.attr('data-startLocation', item.attributes.startLocation);
            }

            target.html('');
            target.append('<img src="images/' + item.attributes.environment + '.png" />');

            // To allow it to be dragged to the wastebasket.
            target.addClass('draggable mapItem');
            target.draggable({helper: 'clone', revert: 'invalid'});

            // Populate the relevant location properties if this location is currently
            // open in the properties window.
            // use $('#propertiesPanel').attr('data-id');  and look up the location
            // or add x and y attributes to the propertiesPanel.
            var selectedMapCell = $('#mapTable').find(".mapItem.selected");
            if ((selectedMapCell.length > 0) &&
                (selectedMapCell.attr('data-x') === item.attributes['x']) &&
                (selectedMapCell.attr('data-y') === item.attributes['y'])) {
                populateLocationDetails(locations, item, true);
            }
        }
    });

    var mView = new LocationsView({collection: locations});


    // Handle game commands
    $('#inputArea').keypress(function(event) {
        if (event.keyCode == 13) {
            // ajax send command
            $.post(
                '/gameCommand',
                { "command": $('#inputArea').val() },
                function (data) {
                    console.log(data);
                }
            ).fail(function(res){
                alert("Error: " + res.getResponseHeader("error"));
            });
        }
    });

    // Show / edit map locations
    $(document).on('mouseenter', '#mapPanel', function() {});

    $(document).on('mouseleave', '#mapPanel', function() {});

    $(document).on('mouseenter', '.mapItem', function(e) {
        /*
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            $('#currentCell').val($(this).prop('id'));
            $(this).closest('td').css('border-color', 'red');
            populateMapLocationDetails(locations, $(this), false);
        }
        */
    });

    $(document).on('mouseleave', '.mapItem', function(e) {
        /*
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            $('#currentCell').val('');
            $(this).closest('td').css('border-color', '');
            clearLocationDetails();
        }
        */
    });
});


//
// Utility functions
//

function drawMapGrid(realmWidth, realmHeight)
{
    var mapTable = $('#mapTable');
    var tableContents = '';

    /* Being an html table, it has to be drawn from the top left to
       bottom right, but we want to label the cells with the origin
       at the bottom left.
    */

    // Allow an extra cell at the top and bottom of the table for the cell labels.
    for (var yCounter = realmHeight +1; yCounter >= 0; yCounter--) {
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<tr>';
        } else {
            tableContents += '<tr id="row_' + yCounter + '">';
        }

        // Allow an extra cell at the start of the row for the cell labels.
        tableContents += '<td style="border-style: none">';
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        // Draw the columns.
        for (var xCounter = 1; xCounter <= realmWidth; xCounter++) {
            // Draw the column labels in the top and bottom rows.
            if ((yCounter === 0) || (yCounter === realmHeight +1)) {
                tableContents += '<td style="border-style: none"><div style="width:50px; height:50px; line-height:50px; text-align:center;">' + xCounter + '</div></td>';
            } else {
                // Draw the regular map cells.
                tableContents += '<td id="cell_' + xCounter + "_" + yCounter + '"> ' +
                '<div class="droppable" style="width:50px; height:50px;" ' +
                'data-x="' + xCounter + '" data-y="' + yCounter + '" data-env=""></div>' +
                '</td>';
            }
        }

        // Allow an extra cell at the end of the row for the cell labels.
        tableContents += '<td style="border-style: none">';
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        tableContents += '</tr>';
    }
    mapTable.html(tableContents);
}

function buildMessageArea() {
    var html = "";
    var numRows = 25;
    for (var row=0; row <numRows; row++) {
        html += "<tr><td><input id='text_row_" + row + "' class='messageRow' size='80' readonly /></td></tr>";
    }

    $('#messageTable').html(html);
}
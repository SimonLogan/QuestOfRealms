/**
 * Created by Simon on 05/02/14.
 */

// Constants
var PALETTE_TABLE_COLS = 4;

// Global data
var terrainData;

/*
 http://stackoverflow.com/questions/2465452/jqueryui-drag-element-from-dialog-and-drop-onto-main-page
 http://jqueryui.com/draggable/
 http://stackoverflow.com/questions/18147632/jqueryui-draggable-droppable-identify-the-drop-target-when-the-drop-is-invalid
 */

$(document).ready(function() {
    var realmWidth = parseInt($('#realmWidth').val());
    var realmHeight = parseInt($('#realmHeight').val());

    var mapTable = $('#mapTable');
    var tableContents = '';
    for (var y = 0; y < realmHeight; y++) {
        tableContents += '<tr id="row_' + y + '">';
        for (var x = 0; x < realmWidth; x++) {
            tableContents += '<td id="cell_' + y + '_' + x + '"> ' +
                '<div class="droppable" style="width:50px; height:50px;" ' +
                'data-x="' + x + '" data-y="' + y + '" data-terrain=""></div>' +
                '</td>';
        }
        tableContents += '</tr>';
    }
    mapTable.html(tableContents);

    $(function() {
        $( "#tabs" ).tabs();
    });

    loadTerrainPalette();

    $(document).on ('mouseover', '.paletteItem', function() {
        if ($(this).prop('id').length == 0)
            return;

        var paletteItem = findPaletteItemByName(terrainData, $(this).prop('id'));
        $('#infoText').text(paletteItem.description);
    });

    $(document).on ('mouseleave', '.paletteItem', function() {
        $('#infoText').text('');
    });

    var MapLocationModel = Backbone.Model.extend({
        urlRoot: '/maplocation'
    });

    var SailsCollection = Backbone.Collection.extend({
        questCollection: "",
        socket: null,
        sync: function(method, model, options){
            var where = {};
            if (options.where) {
                where = {
                    where: options.where
                }
            }

            if(typeof this.questCollection === "string" && this.questCollection !== "") {
                this.socket = io.connect();
                this.socket.on("connect", _.bind(function(){
                    this.socket.request("/" + this.questCollection, where, _.bind(function(maplocation){
                        // Let's not populate the collection initially.
                        // Use it only for updates.
                        //this.set(maplocation);
                        console.log("connection");
                    }, this));

                    this.socket.on("message", _.bind(function(msg){
                        var m = msg.verb;
                        console.log(m);

                        if (m === "create") {
                            this.add(msg.data);
                        } else if (m === "update") {
                            this.get(msg.data.id).set(msg.data);
                        } else if (m === "destroy") {
                            this.remove(this.get(msg.data.id));
                        }

                    }, this));
                }, this));
            } else {
                console.log("Error: Cannot retrieve models because property 'questCollection' not set on collection");
            }
        }
    });

    var MapLocationCollection = SailsCollection.extend({
        questCollection: 'maplocation',
        model: MapLocationModel
    });

    var locations = new MapLocationCollection();
    // Load the existing data. We may choose not to do this if we are going to provide
    // a /loadData API.
    locations.fetch();

    _.templateSettings = {
        interpolate : /\{\{(.+?)\}\}/g
    };
    var LocationsView = Backbone.View.extend({
        //el: '#messagesContainer',
        initialize: function () {
            this.collection.on('add', this.render, this);
            this.render();
        },
        //template: _.template("<div><p><b>{{ username }}: </b>{{ message }}</p></div>"),
        render: function ( item ) {
            //this.$el.html("");

            if (item != undefined) {
                console.log("received new " + item.attributes.x, ", " + item.attributes.y +
                    ", " + item.attributes.terrain);

                // Update the local display with the message data.
                var target = $('#mapTable td[id="cell_' + item.attributes.y + '_' + item.attributes.x + '"]').find('DIV');
                target.attr('data-terrain', item.attributes.terrain);
                target.append('<img src="images/' + item.attributes.terrain + '.png" />');
            }
        }
    });

    var mView = new LocationsView({collection: locations});

    $('.droppable').droppable({
        drop: function (event, ui) {
            var target = $(this);
            var terrain = $(ui.draggable).attr('id');

            // The message is an instance of models/MapLocation
            locations.create({x: target.attr('data-x'),
                y: target.attr('data-y'),
                terrain: terrain}, {wait: true});
        }
    });
});

function findPaletteItemByName(data, searchName) {
    for (var i = 0, len = data.length; i < len; i++) {
        if (data[i].name === searchName)
            return data[i]; // Return as soon as the object is found
    }

    return null; // The object was not found
}

function loadTerrainPalette() {
    $.get(
        '/loadEnvPalette',
        function (data) {
            var target = $('#tabs-terrain');
            terrainData = data;

            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' id='" +
                    item.name + "'><img src='" + item.image + "'/>";
                html += "</div>";
                var paletteItem = $(html);
                paletteItem.draggable({helper: 'clone', revert: 'invalid'});
                paletteItem.appendTo(container);
                container.appendTo(target);
            });
        }
    ).fail(function(res){
            alert("Error: " + res.getResponseHeader("error"));
        });

    // socket is globalized by sails
    socket.get('/echo', {
        message: 'hi there!'
    }, function (response) {
        console.log("response: " + response);
        // response === {success: true, message: 'hi there!'}
    });
};
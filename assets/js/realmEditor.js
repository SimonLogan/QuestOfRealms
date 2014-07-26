/**
 * Created by Simon on 05/02/14.
 */

// Constants

// Global data
var envData;
var itemData;
var selectedCell = null;

/*
 http://stackoverflow.com/questions/2465452/jqueryui-drag-element-from-dialog-and-drop-onto-main-page
 http://jqueryui.com/draggable/
 http://stackoverflow.com/questions/18147632/jqueryui-draggable-droppable-identify-the-drop-target-when-the-drop-is-invalid
 */

$(document).ready(function() {
    var realmWidth = parseInt($('#realmWidth').val());
    var realmHeight = parseInt($('#realmHeight').val());
    var realmId = $('#realmId').val();

    // Draw an empty map grid.
    var mapTable = $('#mapTable');
    var tableContents = '';
    for (var y = 0; y < realmHeight; y++) {
        tableContents += '<tr id="row_' + y + '">';
        for (var x = 0; x < realmWidth; x++) {
            tableContents += '<td id="cell_' + y + '_' + x + '"> ' +
                             '<div class="droppable" style="width:50px; height:50px;" ' +
                                'data-x="' + x + '" data-y="' + y + '" data-env=""></div>' +
                             '</td>';
        }
        tableContents += '</tr>';
    }
    mapTable.html(tableContents);

    // Create the tabbed panels and load the data.
    $(function() {
        $("#palette").tabs();
        $("#propertiesPanel").tabs();
    });

    envData = loadEnvPalette();
    itemData = loadItemsPalette();

    var MapLocationModel = Backbone.Model.extend({
            urlRoot: '/maplocation'
        });

    var QuestCollection = Backbone.Collection.extend({
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
                        this.set(maplocation);
                        console.log("connection");
                    }, this));

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
            } else {
                console.log("Error: Cannot retrieve models because property 'questCollection' not set on collection");
            }
        }
    });

    var MapLocationCollection = QuestCollection.extend({
            questCollection: 'maplocation',
            model: MapLocationModel
        });

    var locations = new MapLocationCollection();
    // Load the existing data. We may choose not to do this if we are going to provide
    // a /loadData API.
    locations.fetch({ where: { realmId: realmId } });

    _.templateSettings = {
        interpolate : /\{\{(.+?)\}\}/g
    };

    var LocationsView = Backbone.View.extend({
        initialize: function () {
            this.collection.on('add', this.render, this);
            this.collection.on('remove', this.remove, this);
            this.collection.on('change', this.change, this);
        },
        render: function(item) {
            if (item != undefined) {
                //console.log("in view.render, received new " + item.attributes.x, ", " + item.attributes.y +
                //    ", " + item.attributes.environment);

                // Update the local display with the message data.
                var target = $('#mapTable td[id="cell_' + item.attributes.y + '_' + item.attributes.x + '"]').find('DIV');
                target.attr('data-env', item.attributes.environment);
                target.append('<img src="images/' + item.attributes.environment + '.png" />');

                // To allow it to be dragged to the wastebasket.
                target.addClass('draggable mapItem');
                target.draggable({helper: 'clone', revert: 'invalid'});

                // Populate the relevant location properties
                $('#envType').text(item.attributes.environment);
            }
        },
        remove: function(item) {
            //console.log("in view.remove");
            var target = $('#mapTable td[id="cell_' + item.attributes.y + '_' + item.attributes.x + '"]').find('DIV');
            target.html('');

            // To allow it to be dragged to the wastebasket.
            target.removeClass('draggable mapItem');
        },
        change: function(item) {
            console.log("in view.change");
        }
    });

    var mView = new LocationsView({collection: locations});

    // Handle and item that was dragged and dropped. This could be:
    // 1. An item from the palette dropped onto the grid.
    // 2. An item moved in the grid.
    // 3. An item (from palette or grid) dropped onto the wastebasket.
    $('.droppable').droppable({
        drop: function (event, ui) {
            var droppedItem = $(ui.draggable);
            var target = $(this);
            var droppedPaletteItem = droppedItem.is('.paletteItem');
            var droppedMapItem = droppedItem.is('.mapItem');

            if (droppedPaletteItem) {
                console.log(("dropped paletteItem"));
            }

            if (droppedMapItem) {
                console.log(("dropped mapItem"));
            }

            if (target.is('#wastebasket')) {
                console.log("Dropped item onto wastebasket");
                if (droppedMapItem)
                    removeMapItem(locations, droppedItem.attr('data-x'), droppedItem.attr('data-y'));

                // No need to do anything when a palette item is dropped
                // on the wastebasket.
                return;
            }
            else {
                console.log("Dropped item onto map");
                var existingLocationItem = locations.where({
                    x: target.attr('data-x'), y:target.attr('data-y')});

                if (existingLocationItem.length === 0) {
                    console.log("create new item");
                    // Create the new item if dragging an environment.
                    if ((droppedPaletteItem && droppedItem.attr('data-category') === "environment") ||
                        droppedMapItem) {
                            var environment = (droppedPaletteItem ? droppedItem.attr('data-name') :
                                                                    droppedItem.attr('data-env'));

                            // The message is an instance of models/MapLocation
                            locations.create({realmId: realmId,
                                              x: target.attr('data-x'),
                                              y: target.attr('data-y'),
                                              environment: environment,
                                              items: [],
                                              characters: []}, {wait: true});

                            // If dragging an existing map item, treat this as a move.
                            if (droppedItem.is('.mapItem'))
                                removeMapItem(locations, droppedItem.attr('data-x'), droppedItem.attr('data-y'));

                    } else {
                        console.error("can't drop item category '" +
                                      droppedItem.attr('data-category') +
                                      "' onto empty map location.");
                    }
                } else {
                    console.log("edit existing item");
                     $.post(
                         '/createItem',
                         {
                             type: droppedItem.attr('data-name'),
                             name: '',
                             description: '',
                             image: droppedItem.attr('data-image'),
                             locationId: existingLocationItem[0].id
                         },
                         function (data) {
                             existingLocationItem[0].attributes.items.push({"id": data.id});
                             existingLocationItem[0].save();
                         }
                     ).fail(function(res){
                         alert("Error: " + res.getResponseHeader("error"));
                     });
                }
            }
        }
    });

    // Show palette properties
    $(document).on ('mouseover', '#palettePanel', function() {
        if (selectedCell === null) {
            $('#propertiesPanel').tabs({disabled:[1,2]})
            $('#propertiesPanelTitle').text("Palette item properties");
            $('#locationPropertiesPanel').hide();
            $('#paletteItemPropertiesPanel').show();
        }
    });

    $(document).on ('mouseleave', '#palettePanel', function() {
        if (selectedCell === null) {
            $('#propertiesPanelTitle').text("Properties");
            $('#paletteItemPropertiesPanel').hide();
        }
    });

    $(document).on ('mouseover', '.paletteItem', function() {
        if ($(this).prop('id').length == 0)
            return;

        if (selectedCell === null) {
            var tabData = envData;
            if ($('#palette').tabs('option', 'active') === 1) tabData = itemData;

            var paletteItem = findPaletteItemByName(tabData, $(this).prop('id'));
            populatePaletteDetails(paletteItem);
        }
    });

    $(document).on ('mouseleave', '.paletteItem', function() {
        if (selectedCell === null) {
            clearPaletteDetails();
        }
    });

    // Show / edit map locations
    $(document).on ('mouseover', '#mapPanel', function() {
        $('#propertiesPanel').tabs({disabled:[]})
        $('#propertiesPanelTitle').text("Location properties");
        $('#locationPropertiesPanel').show();
        $('#paletteItemPropertiesPanel').hide();
    });

    $(document).on ('mouseleave', '#mapPanel', function() {
        if (selectedCell === null) {
            $('#propertiesPanelTitle').text("Properties");
            $('#locationPropertiesPanel').hide();
        }
    });

    $(document).on ('mouseover', '.mapItem', function() {
        if (selectedCell === null) {
            $('#currentCell').val($(this).prop('id'));
            $('#envType').text($(this).attr('data-env'));
            $(this).closest('td').css('border-color', 'red');
            populateLocationDetails(locations, $(this), false);
        }
    });

    $(document).on ('mouseleave', '.mapItem', function() {
        if (selectedCell === null) {
            $('#currentCell').val('');
            $('#envType').text('');
            $(this).closest('td').css('border-color', '');
            clearLocationDetails();
        }
    });

    $(document).on ('mouseup', '.mapItem', function() {
        if (selectedCell === null) {
            if ($(this).is('.ui-draggable-dragging')) {
                $(this).closest('td').css('border-color', '');
            } else {
                // Activate edit mode.
                $(this).closest('td').css('border-color', 'red');
                mapMode = "edit";
                selectedCell = $(this);
                $('#propertiesPanelTitle').text("Edit location properties");
                populateLocationDetails(locations, selectedCell, false);
            }
        } else if ($(this).attr('data-x') === selectedCell.attr('data-x') &&
                   $(this).attr('data-y') === selectedCell.attr('data-y')) {
            // Click again in the selected cell to cancel edit mode.
            $('#currentCell').val('');
            $('#envType').text('');
            selectedCell.closest('td').css('border-color', '');
            selectedCell = null;
            $('#propertiesPanelTitle').text("Properties");
            clearLocationDetails();
        } else if ($(this).attr('data-x') !== selectedCell.attr('data-x') ||
                   $(this).attr('data-y') !== selectedCell.attr('data-y')) {
            // Click in a different cell to edit it.

            // First deselect the current edit cell.
            console.log("1");
            $('#currentCell').val('');
            $('#envType').text('');
            selectedCell.closest('td').css('border-color', '');
            selectedCell = null;
            $('#propertiesPanelTitle').text("Properties");
            clearLocationDetails();
            console.log("2");

            // Then activate the new edit cell.
            $(this).closest('td').css('border-color', 'red');
            mapMode = "edit";
            selectedCell = $(this);
            $('#propertiesPanelTitle').text("Edit location properties");
            populateLocationDetails(locations, selectedCell, false);
            console.log("3");
        }
    });

    $(document).on ('click', '#save', function() {
        var thisCell = locations.where({
            x: selectedCell.attr('data-x'), y:selectedCell.attr('data-y')});

        var locationName = $('#locationName').val().trim();
        if (locationName.length > 0) {
            thisCell[0].attributes.name = locationName;
        }

        thisCell[0].save();
    });
});


//
// Utility functions
//

function removeMapItem(collection, x, y)
{
    var models = collection.where({x: x, y: y});

    if (models.length > 0) {
        models[0].destroy();
        collection.remove(models[0]);
    }
}


// Populate the properties window for the specified palette item.
// params:
//   paletteItem: the palette item.
function populatePaletteDetails(paletteItem)
{
    $('#paletteItemName').text(paletteItem.name);
    $('#paletteItemDescription').text(paletteItem.description);
}


function clearPaletteDetails()
{
    $('#paletteItemName').text('');
    $('#paletteItemDescription').text('');
}


// Populate the properties window for the specified location.
// params:
//   locationCollection: the collection of locations to search.
//   location: the mapLocation cell of interest.
//   allDetails: true shows all details. False shows only high-level details.
function populateLocationDetails(locationCollection, location, allDetails)
{
    $('#propertiesPanelTitle').text("Location properties");
    $('#paletteItemPropertiesPanel').hide();
    $('#locationPropertiesPanel').show();

    var thisCell = locationCollection.where({
        x: location.attr('data-x'), y:location.attr('data-y')});

    if (thisCell[0].attributes.name !== undefined)
        $('#locationName').val(thisCell[0].attributes.name);

    $('#envType').text(thisCell[0].attributes.environment);
    $('#characterSummary').text(thisCell[0].attributes.characters.length);
    $('#itemSummary').text(thisCell[0].attributes.items.length);

    // Can we get these directly from the current cell's items[] collection?
    displayLocationItems(thisCell[0]);
}


function clearLocationDetails()
{
    $('#propertiesPanelTitle').text("Properties");
    $('#locationName').val('');
    $('#envType').text('');
}


function findPaletteItemByName(data, searchName) {
    for (var i = 0, len = data.length; i < len; i++) {
        if (data[i].name === searchName)
            return data[i]; // Return as soon as the object is found
    }

    return null; // The object was not found
}


function loadEnvPalette() {
    $.get(
        '/loadEnvPalette',
        function (data) {
            var target = $('#palette-environment');
            envData = data;

            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' " +
                           "id='" + item.name + "' " +
                           "data-name='" + item.name + "' " +
                           "data-category='environment' " +
                           "><img src='" + item.image + "'/>";
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
}


function loadItemsPalette() {
    $.get(
        '/loadItemsPalette',
        function (data) {
            var target = $('#palette-items');
            itemData = data;

            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' " +
                           "id='" + item.name + "' " +
                           "data-name='" + item.name + "' " +
                           "data-category='item' " +
                           "data-image='" + item.image + "' " +
                           "><img src='" + item.image + "'/>";
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
}


function displayLocationItems(location)
{
    $.get(
        '/fetchItemsInLocation',
        { "id": location.id },
        function (data) {
            var target = $('#properties-items').html("");

            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' " +
                    "id='" + item.id + "' " +
                    "data-name='" + item.name + "' " +
                    "data-category='item' " +
                    "><img src='" + item.image + "'/>";
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

}

/**
 * Created by Simon on 05/02/14.
 */

// Constants

// Global data
var envData;
var itemData;
var selectedCell = null;
var selectedItem = null;

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
        $("#properties").tabs();
    });

    envData = loadEnvPalette();
    itemData = loadItemsPalette();

    var MapLocationModel = Backbone.Model.extend({
        urlRoot: '/maplocation'
    });

    // Maintain a local collection of map locations.
    // Backbone automatically synchronizes this with the server.
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

            if (typeof this.questCollection === "string" && this.questCollection !== "") {
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

    // Display incoming updates to the Backbone collection.
    var LocationsView = Backbone.View.extend({
        initialize: function () {
            this.listenTo(this.collection, 'add', this.render);
            this.listenTo(this.collection, 'remove', this.remove);
            this.listenTo(this.collection, 'change', this.change);
        },
        render: function(item) {
            if (item != undefined) {
                //console.log("in view.render, received new " + JSON.stringify(item));

                // Update the local display with the message data.
                var target = $('#mapTable td[id="cell_' + item.attributes.y + '_' + item.attributes.x + '"]').find('div');
                target.attr('data-env', item.attributes.environment);
                target.attr('data-id', item.id);
                target.html('');
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
            var target = $('#mapTable td[id="cell_' + item.attributes.y + '_' + item.attributes.x + '"]').find('div');
            target.html('');

            // To allow it to be dragged to the wastebasket.
            target.removeClass('draggable mapItem');
        },
        change: function(item) {
            console.log("in view.render, received change " + JSON.stringify(item));

            // Update the local display with the message data.
            var target = $('#mapTable td[id="cell_' + item.attributes.y + '_' + item.attributes.x + '"]').find('div');
            target.attr('data-env', item.attributes.environment);
            target.html('');
            target.append('<img src="images/' + item.attributes.environment + '.png" />');

            // To allow it to be dragged to the wastebasket.
            target.addClass('draggable mapItem');
            target.draggable({helper: 'clone', revert: 'invalid'});

            // Populate the relevant location properties
            $('#envType').text(item.attributes.environment);
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

            if (target.is('#wastebasket')) {
                console.log("Dropped item onto wastebasket");
                if (droppedItem.is('.mapItem')) {
                    removeAllItemsFromLocation(locations, droppedItem);
                    removeMapLocation(locations, droppedItem.attr('data-x'), droppedItem.attr('data-y'));
                }

                if (droppedItem.is('.propertiesPanelItem'))
                    removeItemFromLocation(locations, droppedItem);

                // No need to do anything when a palette item is dropped
                // on the wastebasket.
                return;
            }
            else {
                console.log("Dropped item onto map");
                var droppedItemOriginalLocation = locations.where({
                    x: droppedItem.attr('data-x'), y:droppedItem.attr('data-y')});

                var droppedItemNewLocation = locations.where({
                    x: target.attr('data-x'), y:target.attr('data-y')});

                if (droppedItemNewLocation.length === 0) {
                    // Dropped at item onto an empty map location.
                    // Create the new location if dragging an environment.
                    if ((droppedItem.is('.paletteItem') && droppedItem.attr('data-category') === "environment") ||
                        droppedItem.is('.mapItem'))
                    {
                        addMapLocation(realmId, locations, droppedItem, droppedItemOriginalLocation, target)
                    } else {
                        console.error("can't drop item category '" +
                            droppedItem.attr('data-category') +
                            "' onto empty map location.");
                    }
                } else {
                    if (droppedItem.is('.paletteItem')) {
                        console.log("dropped paletteItem");
                        addItemToLocation(droppedItem, droppedItemNewLocation);
                    }
                    else if (droppedItem.is('.propertiesPanelItem')) {
                        console.log("dropped propertiesPanelItem");
                        changeItemLocation(locations, droppedItem, droppedItemNewLocation);
                    }
                    else {
                        console.log("Dropped unexpected item type.");
                    }
                }
            }
        }
    });

    $(document).on('mouseenter', '.paletteItem', function() {
        if ($(this).prop('id').length == 0)
            return;

        console.log("mouseenter .paletteItem");
        var tabData = envData;
        if ($('#palette').tabs('option', 'active') === 1) tabData = itemData;

        var paletteItem = findPaletteItemByName(tabData, $(this).attr('data-type'));
        populatePaletteDetails(paletteItem);
    });

    $(document).on('mouseleave', '.paletteItem', function() {
        clearPaletteDetails();
    });

    // Show / edit map locations
    $(document).on('mouseenter', '#mapPanel', function() {
        $('#propertiesPanel').tabs({disabled:[]})
    });

    $(document).on('mouseleave', '#mapPanel', function() {
        if (selectedCell === null) {
            //$('#locationPropertiesPanel').hide();
        }
    });

    $(document).on('mouseenter', '.mapItem', function(e) {
        if (selectedCell === null) {
            $('#currentCell').val($(this).prop('id'));
            $('#envType').text($(this).attr('data-env'));
            $(this).closest('td').css('border-color', 'red');
            populateLocationDetails(locations, $(this), false);
        }
    });

    $(document).on('mouseleave', '.mapItem', function(e) {
        if (selectedCell === null) {
            $('#currentCell').val('');
            $(this).closest('td').css('border-color', '');
            clearLocationDetails();
        }
    });

    $(document).on('mouseup', '.mapItem', function() {
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
            $('#propertiesPanelTitle').text("Location properties");
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

    $(document).on('mouseup', '.propertiesPanelItem', function() {
        if (selectedItem === null) {
            if ($(this).is('.ui-draggable-dragging')) {
                $(this).closest('td').css('border-color', '');
            } else {
                // Activate edit mode.
                $(this).closest('div').css('border-color', 'red');
                selectedItem = $(this);
                populateLocationItemDetails(selectedItem);
            }
        } else if ($(this).attr('data-id') === selectedItem.attr('data-id')) {
            // Click again in the selected item to cancel edit mode.
            selectedItem.closest('div').css('border-color', '');
            selectedItem = null;
            clearLocationItemDetails();
        } else if ($(this).attr('data-id') !== selectedItem.attr('data-id')) {
            // Click in a different item to edit it.

            // First deselect the current edit item.
            selectedItem.closest('div').css('border-color', '');

            // Then activate the new edit item.
            $(this).closest('div').css('border-color', 'red');
            selectedItem = $(this);
            populateLocationItemDetails(selectedItem);
        }
    });

    $(document).on('mouseenter', '.propertiesPanelItem', function() {
        if (selectedItem === null) {
            populateLocationItemDetails($(this));
        }
    });

    $(document).on('mouseleave', '.propertiesPanelItem', function() {
        if (selectedItem === null) {
            clearLocationItemDetails();
        }
    });

    $(document).on('change', '.locationProperty', function() {
        var thisCell = locations.where({
            x: selectedCell.attr('data-x'), y:selectedCell.attr('data-y')});

        thisCell[0].attributes.name = $('#locationName').val().trim();
        thisCell[0].save();
    });

    $(document).on('change', '.itemProperty', function() {
        console.log("itemProperty change");

        $.post(
            '/editItem',
            {
                id: selectedItem.attr('data-id'),
                name: $('#itemName').val().trim()
            },
            function (data) {
                populateLocationDetails(locations, selectedCell, false);
            }
        ).fail(function(res){
            alert("Error: " + res.getResponseHeader("error"));
        });
    });
});


//
// Utility functions
//

function addMapLocation(realmId, collection, droppedItem, originalLocation, newLocation)
{
    var environment = (droppedItem.is('.paletteItem') ?
        droppedItem.attr('data-type') : droppedItem.attr('data-env'));

    // If dragging an existing map item, treat this as a move.
    // Simulate a move by creating and deleting. This will publish events for both.
    copiedItems = [];
    if (droppedItem.is('.mapItem'))
        copiedItems = originalLocation[0].attributes.items;

    // An update doesn't work well for a location move, as only the
    // updated record gets published, meaning we can't remove
    // the old location from the map. Do an add + remove.

    var newObj = collection.create({
        realmId: realmId,
        x: newLocation.attr('data-x'),
        y: newLocation.attr('data-y'),
        environment: environment,
        items: copiedItems,
        characters: []}, {wait: true});

    if (droppedItem.is('.mapItem'))
        removeMapLocation(collection, droppedItem.attr('data-x'), droppedItem.attr('data-y'));
}


function removeMapLocation(collection, x, y)
{
    var models = collection.where({x: x, y: y});

    if (models.length > 0) {
        models[0].destroy();
        collection.remove(models[0]);
    }
}


function removeAllItemsFromLocation(collection, location)
{
    //var itemLocation = collection.where({id: $('#propertiesPanel').attr('data-id')});
    var itemLocation = collection.where({id: location.attr('data-id')});
    items = [];
    itemLocation[0].attributes.items.forEach(function(thisItem) {
        items.push(thisItem.id);
    });

    $.post(
        '/deleteItems',
        { "ids": JSON.stringify(items) },
        function (data) {
            var j=5;
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}


function removeItemFromLocation(collection, droppedItem)
{
    var itemLocation = collection.where({id: $('#propertiesPanel').attr('data-id')});
    var locationItems = itemLocation[0].attributes['items'];
    items = [droppedItem.attr('data-id')];

    for (var i=0; i<locationItems.length; i++) {
        if (locationItems[i].id == droppedItem.attr('data-id')) {
            $.post(
                '/deleteItems',
                { ids: JSON.stringify(items) },
                function (data) {
                    locationItems.splice(i, 1);
                    itemLocation[0].save();
                    $('#itemList').find('#' + droppedItem.attr('data-id')).remove();
                }
            ).fail(function(res){
                alert("Error: " + res.getResponseHeader("error"));
            });

            break;
        }
    }
}


function changeItemLocation(collection, droppedItem, newLocation)
{
    var originalLocation = collection.where({id: $('#propertiesPanel').attr('data-id')});
    var originalLocationItems = originalLocation[0].attributes['items'];

    for (var i=0; i<originalLocationItems.length; i++) {
        if (originalLocationItems[i].id == droppedItem.attr('data-id')) {
            // Update the old location.
            originalLocationItems.splice(i, 1);
            originalLocation[0].save();
            $('#itemList').find('#' + droppedItem.attr('data-id')).remove();

            // Update the new location.
            newLocation[0].attributes.items.push({"id": droppedItem.attr('data-id')});
            newLocation[0].save();

            break;
        }
    }
}


function addItemToLocation(droppedItem, location)
{
    $.post(
        '/createItem',
        {
            type: droppedItem.attr('data-type'),
            name: '',
            description: '',
            image: droppedItem.find('img').attr('src')
        },
        function (data) {
            location[0].attributes.items.push({"id": data.id});
            location[0].save();
        }
    ).fail(function (res) {
        alert("Error: " + res.getResponseHeader("error"));
    });
}


// Populate the properties window for the specified palette item.
// params:
//   paletteItem: the palette item.
function populatePaletteDetails(paletteItem)
{
    $('#paletteItemType').text(paletteItem.type);
    $('#paletteItemDescription').text(paletteItem.description);
}


function clearPaletteDetails()
{
    $('#paletteItemType').text('');
    $('#paletteItemDescription').text('');
}


function populateLocationItemDetails(item)
{
    $('#itemName').val(item.attr('data-name'));
    $('#itemDescription').text(item.attr('data-type'));
}


function clearLocationItemDetails(item)
{
    $('#itemName').val('');
    $('#itemDescription').text('');
}


// Populate the properties window for the specified location.
// params:
//   locationCollection: the collection of locations to search.
//   location: the mapLocation cell of interest.
//   allDetails: true shows all details. False shows only high-level details.
function populateLocationDetails(locationCollection, location, allDetails)
{
    var thisCell = locationCollection.where({
        x: location.attr('data-x'), y:location.attr('data-y')});

    if (thisCell[0].attributes.name !== undefined)
        $('#locationName').val(thisCell[0].attributes.name);

    $('#propertiesPanel').attr('data-id', location.attr('data-id'));
    $('#envType').text(thisCell[0].attributes.environment);
    $('#characterSummary').text(thisCell[0].attributes.characters.length);
    $('#itemSummary').text(thisCell[0].attributes.items.length);

    // Can we get these directly from the current cell's items[] collection?
    displayLocationItems(thisCell[0]);
}


function clearLocationDetails()
{
    $('#propertiesPanel').removeAttr('data-id');
    $('#locationName').val('');
    $('#envType').text('');
    $('#characterSummary').text('');
    $('#itemSummary').text('');
    clearLocationItems();
}


function clearLocationItems()
{
    console.log("clearLocationItems found" + $('#itemList').find('.propertiesPanelItem').length)
    $('#itemList').find('.propertiesPanelItem').remove();
}


function findPaletteItemByName(data, searchName) {
    for (var i = 0, len = data.length; i < len; i++) {
        if (data[i].type === searchName)
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

            var envNum = 1;
            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' " +
                    "id='env_" + envNum++ + "' " +
                    "data-type='" + item.type + "' " +
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

            var itemNum = 1;
            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' " +
                    "id='item_" + itemNum++ + "' " +
                    "data-category='item' " +
                    "data-type='" + item.type + "' " +
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
    console.log(Date.now() + ' displayLocationItems at x:' + location.attributes['x'] + " y: " + location.attributes['y']);
    items = [];
    location.attributes.items.forEach(function(thisItem) {
       items.push(thisItem.id);
    });

    $.get(
        '/fetchItems',
        { "ids": JSON.stringify(items) },
        function (data) {
            var target = $('#itemList').html("");

            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='propertiesPanelItem draggable ui-widget-content' " +
                    "data-id='" + item.id + "' " +
                    "data-name='" + item.name + "' " +  // eg; "the sword of destiny"
                    "data-category='item' " +
                    "data-type='" + item.type + "' " +  // eg; "long sword"
                    "data-x='" + location.attributes['x'] + "' " +
                    "data-y='" + location.attributes['y'] + "' " +
                    "><img src='" + item.image + "'/>";
                html += "</div>";
                var locationItem = $(html);
                locationItem.draggable({helper: 'clone', revert: 'invalid'});
                locationItem.appendTo(container);
                container.appendTo(target);
            });
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}

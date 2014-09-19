/**
 * Created by Simon on 05/02/14.
 */

// Constants

// Global data
var envData;
var itemData;
var characterData;

PaletteItemType = {
    ENV : 0,
    ITEM : 1,
    CHARACTER : 2
}

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
        $("#paletteInnerPanel").tabs();
        $("#propertiesInnerPanel").tabs();
    });

    loadEnvPalette();
    loadItemsPalette();
    loadCharactersPalette();

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
                console.log("in view.render, received new " + JSON.stringify(item));

                // Update the local display with the message data.
                var target = $('#mapTable td[id="cell_' + item.attributes.y + '_' + item.attributes.x + '"]').find('div');
                target.attr('data-env', item.attributes.environment);
                target.attr('data-id', item.id);
                target.html('');
                target.append('<img src="images/' + item.attributes.environment + '.png" />');

                // To allow it to be dragged to the wastebasket.
                target.addClass('draggable mapItem');
                target.draggable({helper: 'clone', revert: 'invalid'});
            }
        },
        remove: function(item) {
            console.log("in view.remove");
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
            populateLocationDetails(locations, item, true);
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
                    removeAllCharactersFromLocation(locations, droppedItem);
                    removeMapLocation(locations, droppedItem.attr('data-x'), droppedItem.attr('data-y'));
                }

                if (droppedItem.is('.propertiesPanelItem')) {
                    if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
                        removeItemFromLocation(locations, droppedItem);
                    }
                    else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2) {
                        removeCharacterFromLocation(locations, droppedItem);
                    }
                }

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
                        if (droppedItem.attr('data-category') === 'item')
                            addItemToLocation(droppedItem, droppedItemNewLocation);
                        else if (droppedItem.attr('data-category') === 'character')
                            addCharacterToLocation(droppedItem, droppedItemNewLocation);
                        else
                            console.log("dropped unexpected item category: " + droppedItem.attr('data-category'));
                    }
                    else if (droppedItem.is('.propertiesPanelItem')) {
                        console.log("dropped propertiesPanelItem");
                        if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
                            changeItemLocation(locations, droppedItem, droppedItemNewLocation);
                        }
                        else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2) {
                            changeCharacterLocation(locations, droppedItem, droppedItemNewLocation);
                        }
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
        var tabData = {class: PaletteItemType.ENV, data: envData};
        if ($('#paletteInnerPanel').tabs('option', 'active') === 1)
            tabData = {class: PaletteItemType.ITEM, data: itemData};
        else if ($('#paletteInnerPanel').tabs('option', 'active') === 2)
            tabData = {class: PaletteItemType.CHARACTER, data: characterData};

        var paletteItem = findPaletteItemByName(tabData.data, $(this).attr('data-type'));
        populatePaletteDetails(tabData.class, paletteItem);
    });

    $(document).on('mouseleave', '.paletteItem', function() {
        clearPaletteDetails();
    });

    // Show / edit map locations
    $(document).on('mouseenter', '#mapPanel', function() {});

    $(document).on('mouseleave', '#mapPanel', function() {});

    $(document).on('mouseenter', '.mapItem', function(e) {
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            $('#currentCell').val($(this).prop('id'));
            $(this).closest('td').css('border-color', 'red');
            populateMapLocationDetails(locations, $(this), false);
        }
    });

    $(document).on('mouseleave', '.mapItem', function(e) {
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            $('#currentCell').val('');
            $(this).closest('td').css('border-color', '');
            clearLocationDetails();
        }
    });

    $(document).on('mouseup', '.mapItem', function() {
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            if ($(this).is('.ui-draggable-dragging')) {
                // Don't show a red border if dragging a cell.
                $(this).closest('td').css('border-color', '');
            } else {
                // You clicked in a cell. Activate edit mode.
                $(this).closest('td').css('border-color', 'red');
                mapMode = "edit";
                $(this).addClass('selected');
                $('#propertiesPanelTitle').text("Edit location properties");
                populateMapLocationDetails(locations, $(this), false);
            }
        } else if ($(this).attr('data-x') === selectedMapCell.attr('data-x') &&
                   $(this).attr('data-y') === selectedMapCell.attr('data-y')) {
            // Click again in the selected cell to cancel edit mode.
            selectedMapCell.closest('td').css('border-color', '');
            selectedMapCell.removeClass('selected');
            $('#propertiesPanelTitle').text("Location properties");
        } else if ($(this).attr('data-x') !== selectedMapCell.attr('data-x') ||
                   $(this).attr('data-y') !== selectedMapCell.attr('data-y')) {
            // Click in a different cell to edit it.
            // First deselect the current edit cell.
            console.log("1");
            $('#currentCell').val('');
            selectedMapCell.closest('td').css('border-color', '');
            selectedMapCell.removeClass('selected');
            clearLocationDetails();
            console.log("2");

            // Then activate the new edit cell.
            $(this).closest('td').css('border-color', 'red');
            mapMode = "edit";
            $(this).addClass('selected');
            $('#propertiesPanelTitle').text("Edit location properties");
            populateMapLocationDetails(locations, $(this), false);
            console.log("3");
        }
    });

    $(document).on('mouseup', '.propertiesPanelItem', function() {
        var listName = 'itemList';
        var populateFunction = populateLocationItemDetails;
        var clearFunction = clearLocationItemDetails;
        if ($('#propertiesInnerPanel').tabs('option', 'active') === 2)
        {
            listName = 'characterList';
            populateFunction = populateLocationCharacterDetails;
            clearFunction = clearLocationCharacterDetails;
        }

        var selectedItem = $('#' + listName).find(".propertiesPanelItem.selected");
        if (selectedItem.length === 0) {
            if ($(this).is('.ui-draggable-dragging')) {
                $(this).closest('td').css('border-color', '');
            } else {
                // Activate edit mode: $(this) is now the selectedItem.
                $(this).closest('div').css('border-color', 'red');
                $(this).addClass('selected');
                populateFunction($(this));
            }
        } else if ($(this).attr('data-id') === selectedItem.attr('data-id')) {
            // Click again in the selected item to cancel edit mode.
            selectedItem.closest('div').css('border-color', '');
            selectedItem.removeClass('selected');
            clearFunction();
        } else if ($(this).attr('data-id') !== selectedItem.attr('data-id')) {
            // Click in a different item to edit it.

            // First deselect the current edit item.
            selectedItem.closest('div').css('border-color', '');
            selectedItem.removeClass('selected');

            // Then activate the new edit item.
            $(this).closest('div').css('border-color', 'red');
            $(this).addClass('selected');
            populateFunction($(this));
        }
    });

    $(document).on('mouseenter', '.propertiesPanelItem', function() {
        if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
            if ($('#itemList').find(".propertiesPanelItem.selected").length === 0) {
                console.log("call populateLocationItemDetails");
                populateLocationItemDetails($(this));
            }
        }
        else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2)
        {
            if ($('#characterList').find(".propertiesPanelItem.selected").length === 0) {
                console.log("call populateLocationCharacterDetails");
                populateLocationCharacterDetails($(this));
            }
        }
    });

    $(document).on('mouseleave', '.propertiesPanelItem', function() {
        if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
            if ($('#itemList').find(".propertiesPanelItem.selected").length === 0) {
                console.log("call clearLocationItemDetails");
                clearLocationItemDetails();
            }
        }
        else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2)
        {
            if ($('#characterList').find(".propertiesPanelItem.selected").length === 0) {
                console.log("call clearLocationCharacterDetails");
                clearLocationCharacterDetails();
            }
        }
    });

    $(document).on('change', '.locationProperty', function() {
        console.log("locationProperty change");
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        var thisCell = locations.where({
            x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')});

        thisCell[0].attributes.name = $('#locationName').val().trim();
        thisCell[0].save();
    });

    $(document).on('change', '.itemProperty', function() {
        console.log("itemProperty change");
        var selectedItem = $('#itemList').find(".propertiesPanelItem.selected");
        $.post(
            '/editItem',
            {
                id: selectedItem.attr('data-id'),
                name: $('#itemName').val().trim()
            },
            function (data) {
                var selectedMapCell = $('#itemList').find(".propertiesPanelItem.selected");
                populateMapLocationDetails(locations, selectedMapCell, false);
            }
        ).fail(function(res){
            alert("Error: " + res.getResponseHeader("error"));
        });
    });

    $(document).on('change', '.characterProperty', function() {
        console.log("characterProperty change");
        var selectedCharacter = $('#characterList').find(".propertiesPanelItem.selected");
        $.post(
            '/editCharacter',
            {
                id: selectedCharacter.attr('data-id'),
                name: $('#characterName').val().trim()
            },
            function (data) {
                var selectedMapCell = $('#characterList').find(".propertiesPanelItem.selected");
                populateMapLocationDetails(locations, selectedMapCell, false);
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
    copiedCharacters = [];
    if (droppedItem.is('.mapItem')) {
        copiedItems = originalLocation[0].attributes.items;
        copiedCharacters = originalLocation[0].attributes.characters;
    }

    // An update doesn't work well for a location move, as only the
    // updated record gets published, meaning we can't remove
    // the old location from the map in a remote UI. Do an add + remove.
    // TODO: add + remove is ok for the game designer but in game mode
    // TODO: we'll need to find a way to handle updates properly.
    var newObj = collection.create({
        realmId: realmId,
        x: newLocation.attr('data-x'),
        y: newLocation.attr('data-y'),
        environment: environment,
        items: copiedItems,
        characters: copiedCharacters}, {wait: true});

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
                    // Now remove the item from the properties window if it is visible.
                    // We can't do it directly here as this would only update the local
                    // UI. Do it in the collection view function.
                    //$('#itemList').find('div[data-id="'+ droppedItem.attr('data-id') + '"]').remove();
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
            //$('#itemList').find('#' + droppedItem.attr('data-id')).remove();

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


function removeAllCharactersFromLocation(collection, location)
{
    var characterLocation = collection.where({id: location.attr('data-id')});
    characters = [];
    characterLocation[0].attributes.characters.forEach(function(thisCharacter) {
        characters.push(thisCharacter.id);
    });

    $.post(
        '/deleteCharacters',
        { "ids": JSON.stringify(characters) },
        function (data) {
            var j=5;
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}


function removeCharacterFromLocation(collection, droppedItem)
{
    var characterLocation = collection.where({id: $('#propertiesPanel').attr('data-id')});
    var locationCharacters = characterLocation[0].attributes['characters'];
    characters = [droppedItem.attr('data-id')];

    for (var i=0; i<locationCharacters.length; i++) {
        if (locationCharacters[i].id == droppedItem.attr('data-id')) {
            $.post(
                '/deleteCharacters',
                { ids: JSON.stringify(characters) },
                function (data) {
                    locationCharacters.splice(i, 1);
                    characterLocation[0].save();
                    // Now remove the item from the properties window if it is visible.
                    // We can't do it directly here as this would only update the local
                    // UI. Do it in the collection view function.
                    //$('#itemList').find('div[data-id="'+ droppedItem.attr('data-id') + '"]').remove();
                }
            ).fail(function(res){
                alert("Error: " + res.getResponseHeader("error"));
            });

            break;
        }
    }
}


function changeCharacterLocation(collection, droppedItem, newLocation)
{
    var originalLocation = collection.where({id: $('#propertiesPanel').attr('data-id')});
    var originalLocationCharacters = originalLocation[0].attributes['characters'];

    for (var i=0; i<originalLocationCharacters.length; i++) {
        if (originalLocationCharacters[i].id == droppedItem.attr('data-id')) {
            // Update the old location.
            originalLocationCharacters.splice(i, 1);
            originalLocation[0].save();
            //$('#characterList').find('#' + droppedItem.attr('data-id')).remove();

            // Update the new location.
            newLocation[0].attributes.characters.push({"id": droppedItem.attr('data-id')});
            newLocation[0].save();

            break;
        }
    }
}


function addCharacterToLocation(droppedCharacter, location)
{
    $.post(
        '/createCharacter',
        {
            type: droppedCharacter.attr('data-type'),
            name: '',
            description: droppedCharacter.attr('data-description'),
            additionalInfo: droppedCharacter.attr('data-additionalInfo'),
            damage: droppedCharacter.attr('data-damage'),
            health: droppedCharacter.attr('data-health'),
            drops: droppedCharacter.attr('data-drops'),
            image: droppedCharacter.find('img').attr('src')
        },
        function (data) {
            location[0].attributes.characters.push({"id": data.id});
            location[0].save();
        }
    ).fail(function (res) {
        alert("Error: " + res.getResponseHeader("error"));
    });
}


// Populate the properties window for the specified palette item.
// params:
//   paletteItem: the palette item.
function populatePaletteDetails(paletteItemClass, paletteItem)
{
    if (PaletteItemType.ENV === paletteItemClass) {
        $('#paletteEnvType').text(paletteItem.type);
        $('#paletteEnvDescription').text(paletteItem.description);
    }
    else if (PaletteItemType.ITEM === paletteItemClass) {
        $('#paletteItemType').text(paletteItem.type);
        $('#paletteItemDescription').text(paletteItem.description);
        $('#paletteItemDamage').text(paletteItem.damage);
    }
    else if (PaletteItemType.CHARACTER === paletteItemClass) {
        $('#paletteCharacterType').text(paletteItem.type);
        $('#paletteCharacterDescription').text(paletteItem.description);
        $('#paletteCharacterAddInfo').text(paletteItem.additional_info);
        $('#paletteCharacterHealth').text(paletteItem.health);
        $('#paletteCharacterDamage').text(paletteItem.damage);
        $('#paletteCharacterDrops').text(paletteItem.drops);
    }
}


function clearPaletteDetails()
{
    var activeTab = $('#paletteInnerPanel').tabs('option', 'active');
    if (0 === activeTab) {
        $('#paletteEnvType').text('');
        $('#paletteEnvDescription').text('');
    }
    else if (1 === activeTab) {
        $('#paletteItemType').text('');
        $('#paletteItemDescription').text('');
        $('#paletteItemDamage').text('');
    }
    else if (2 === activeTab) {
        $('#paletteCharacterType').text('');
        $('#paletteCharacterDescription').text('');
        $('#paletteCharacterAddInfo').text('');
        $('#paletteCharacterHealth').text('');
        $('#paletteCharacterDamage').text('');
        $('#paletteCharacterDrops').text('');
    }
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


function populateLocationCharacterDetails(character)
{
    $('#characterName').val(character.attr('data-name'));
    $('#characterType').text(character.attr('data-type'));
    $('#characterDescription').text(character.attr('data-description'));
    $('#characterAddInfo').text(character.attr('data-additionalInfo'));
    $('#characterDamage').text(character.attr('data-damage'));
    $('#characterHealth').text(character.attr('data-health'));
    $('#characterDrops').text(character.attr('data-drops'));
}


function clearLocationCharacterDetails(character)
{
    $('#characteName').val('');
    $('#characterType').text('');
    $('#characterDescription').text('');
    $('#characterAddInfo').text('');
    $('#characterDamage').text('');
    $('#characterHealth').text('');
    $('#characterDrops').text('');
}


// Populate the properties window for the specified location.
// params:
//   locationCollection: the collection of locations to search.
//   location: the mapLocation UI cell of interest.
//   allDetails: true shows all details. False shows only high-level details.
function populateMapLocationDetails(locationCollection, location, allDetails)
{
    var thisCell = locationCollection.where({
        x: location.attr('data-x'), y:location.attr('data-y')});

    populateLocationDetails(locationCollection, thisCell[0], allDetails);
}


// Populate the properties window for the specified location.
// params:
//   locationCollection: the collection of locations to search.
//   location: the mapLocation data object of interest.
//   allDetails: true shows all details. False shows only high-level details.
function populateLocationDetails(locationCollection, location, allDetails)
{
    if (location.attributes.name !== undefined)
        $('#locationName').val(location.attributes.name);

    $('#propertiesPanel').attr('data-id', location.id);
    $('#envType').text(location.attributes.environment);
    $('#characterSummary').text(location.attributes.characters.length);
    $('#itemSummary').text(location.attributes.items.length);

    // Can we get these directly from the current cell's items[] collection?
    displayLocationItems(location);
    displayLocationCharacters(location);
}


function clearLocationDetails()
{
    $('#propertiesPanel').removeAttr('data-id');
    $('#locationName').val('');
    $('#envType').text('');
    $('#characterSummary').text('');
    $('#itemSummary').text('');
    clearLocationItems();
    clearLocationCharacters();
}


function clearLocationItems()
{
    console.log("clearLocationItems found" + $('#itemList').find('.propertiesPanelItem').length)
    $('#itemList').find('.propertiesPanelItem').remove();
}


function clearLocationCharacters()
{
    console.log("clearLocationCharacters found" + $('#characterList').find('.propertiesPanelItem').length)
    $('#characterList').find('.propertiesPanelItem').remove();
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
            var target = $('#paletteEnvList');
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
            var target = $('#paletteItemList');
            itemData = data;

            var itemNum = 1;
            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' " +
                    "id='item_" + itemNum++ + "' " +
                    "data-category='item' " +
                    "data-type='" + item.type + "' " +
                    "data-image='" + item.image + "' " +
                    "data-description='" + item.description + "' " +
                    "data-damage='" + item.damage + "' " +
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


function loadCharactersPalette() {
    $.get(
        '/loadCharactersPalette',
        function (data) {
            var target = $('#paletteCharactersList');
            characterData = data;

            var itemNum = 1;
            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='paletteItem draggable ui-widget-content' " +
                    "id='char_" + itemNum++ + "' " +
                    "data-category='character' " +
                    "data-type='" + item.type + "' " +
                    "data-image='" + item.image + "' " +
                    "data-description='" + item.description + "' " +
                    "data-additionalinfo='" + item.additional_info + "' " +
                    "data-health='" + item.health + "' " +
                    "data-damage='" + item.damage + "' " +
                    "data-drops='" + item.drops + "' " +
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


function displayLocationCharacters(location)
{
    console.log(Date.now() + ' displayLocationCharacters at x:' + location.attributes['x'] + " y: " + location.attributes['y']);
    characters = [];
    location.attributes.characters.forEach(function(thisCharacter) {
        characters.push(thisCharacter.id);
    });

    $.get(
        '/fetchCharacters',
        { "ids": JSON.stringify(characters) },
        function (data) {
            var target = $('#characterList').html("");

            data.forEach(function(item) {
                var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                var html = "<div class='propertiesPanelItem draggable ui-widget-content' " +
                    "data-id='" + item.id + "' " +
                    "data-name='" + item.name + "' " +  // eg; "turnip stealer"
                    "data-category='character' " +
                    "data-type='" + item.type + "' " +  // eg; "iron boar"
                    "data-description='" + item.description + "' " +
                    "data-additionalInfo='" + item.additionalInfo + "' " +
                    "data-health='" + item.health + "' " +
                    "data-damage='" + item.damage + "' " +
                    "data-drops='" + item.drops + "' " +
                    "data-x='" + location.attributes['x'] + "' " +
                    "data-y='" + location.attributes['y'] + "' " +
                    "><img src='" + item.image + "'/>";
                html += "</div>";
                var locationCharacter = $(html);
                locationCharacter.draggable({helper: 'clone', revert: 'invalid'});
                locationCharacter.appendTo(container);
                container.appendTo(target);
            });
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}

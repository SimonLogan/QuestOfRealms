/**
 * Created by Simon on 05/02/14.
 * This file implements the interactions for the realm editor page.
 */

// Constants

// Global data: options available in the various tabs in the palette window.
var envPaletteData;
var itemPaletteData;
var characterPaletteData;
var objectivePaletteData;

PaletteItemType = {
    ENV : 0,
    ITEM : 1,
    CHARACTER : 2
}

// The actual realm you will be editing.
var realmData;

// When the page has finished rendering...
$(document).ready(function() {
   // Get the id of the realm we're editing so that we can look it up wity AJAX.
   // This value comes from the HTML element with id="realmId".
   // The jQuery selectors $(#XXX) below select the elements by id.
   // The data was placed into this element in the first place by the template parameter
   //    value="<%= realm.id %>"
   // which gets its value from the data passed to the view function by editRealm() in
   // api/controllers/QuestRealmcontroller.js:
   //    return res.view("questRealm/editRealm", {
   //        realm: {
   //            id: realm.id
   //       }
   var realmId = $('#realmId').val();

   // Load the realm and call the function below when it has been retrieved.
   // You need to use this callback approach because the AJAX call is
   // asynchronous. This means the code here won't wait for it to complete,
   // so you have to provide a function that can be called when the data is ready.
   loadRealm(function() {
        $('#realmName').text("Realm Designer: Editing realm " + realmData.name);
        drawMapGrid(realmData.width, realmData.height);

        // Handle and item that was dragged and dropped. This could be:
        // 1. An item from the palette dropped onto the grid.
        // 2. An item moved in the grid.
        // 3. An item (from palette or grid) dropped onto the wastebasket.
        $('.droppable').droppable({
            drop: function (event, ui) {
                var droppedItem = $(ui.draggable);
                var target = $(this);

                if (target.is('#wastebasket')) {
                    moveToWasteBasket(locations, droppedItem);
                }
                else {
                    droppedMapItem(realmId, locations, droppedItem, target);
                }
            }
        });

        displayObjectives();
    });

   // Call the various server functions to load details of the supported
   // environments, items, characters, and objectives. Populate the various
   // tool menus on the screen with this info.
   // NOTE: Since we have accordion widgets inside tabs, we need to ensure the accordions
   // are populated before the tabs are activated, or the accordions in the items and
   // characters tabs won't display correctly.
   async.parallel([
       function(callback) {
          loadEnvPalette(callback);
       },
       function(callback) {
          loadItemsPalette(callback);
       },
       function(callback) {
          loadCharactersPalette(callback);
       },
       function(callback) {
          loadObjectivesPalette(callback);
       }
   ],
   function(err, results) {
      // Create the tabbed panels
      $("#paletteInnerPanel").tabs();
      $("#propertiesInnerPanel").tabs();
   });

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
            // This renders the initial collection and saves updates, but other user sessions
            // do not dynamically update. I can live with this for now.
            io.socket.request({ url: "/maplocation", method: "get" }, _.bind(function(maplocations){
               // Populate the collection initially.
               this.set(maplocations);
               console.log("connection");
            }, this));

            // This no longer seems to fire.
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

   var locations = new MapLocationCollection();
   // Load the existing data into the collection.
   locations.fetch({ where: { "realmId": realmId } });


   /* Dialogs */

    // The edit item dialog
    $(function() {
        var dialog, form,
            name = $("#editItemName"),
            description = $("#editItemDescription"),
            damage = $("#editItemDamage"),
            allFields = $([]).add(name).add(description).add(damage);

        function close () {
            form[0].reset();
            allFields.removeClass("ui-state-error");
            dialog.dialog("close");
        };

        function save() {
            var selectedItem = $('#itemList').find(".propertiesPanelItem.selected");
            var thisCell = locations.where({
                x: selectedItem.attr('data-x'), y:selectedItem.attr('data-y')});

            var newItem = thisCell[0].attributes.items[selectedItem.attr('data-index')];
            newItem.name = $('#editItemName').val().trim();
            newItem.description = $('#editItemDescription').text();
            newItem.damage = $('#editItemDamage').text();
            thisCell[0].attributes.items[selectedItem.attr('data-index')] = newItem;
            thisCell[0].save();
            close();
        };

        dialog = $("#editItemDialog").dialog({
            autoOpen: false,
            height: 600,
            width: 525,
            modal: true,
            buttons: {
                "Save": save,
                "Cancel": close
            },
            close: close
        }).css("font-size", "12px");

        form = dialog.find("form").on("submit", function(event) {
            event.preventDefault();
            save();
        });

        $("#editItemProperties").click(function() {
            $('#editItemName').val($('#itemName').val());
            $('#editItemType').val($('#itemType').text());
            $('#editItemDescription').val($('#itemDescription').text());
            $('#editItemDamage').val($('#itemDamage').text());
            dialog.dialog("open");
        });
    });

    // The edit character dialog.
    $(function() {
        var dialog, form,
            name = $("#editCharacterName"),
            description = $("#editCharacterDescription"),
            addInfo = $("#editCharacterAddInfo"),
            damage = $("#editCharacterDamage"),
            health = $("#editCharacterHealth"),
            drops = $("#editCharacterDrops"),
            allFields = $([]).add(name).add(description).add(addInfo).add(health).add(damage).add(drops);

        function close () {
            form[0].reset();
            allFields.removeClass("ui-state-error");
            dialog.dialog("close");
        };

        function save() {
            var selectedCharacter = $('#characterList').find(".propertiesPanelItem.selected");
            var thisCell = locations.where({
                x: selectedCharacter.attr('data-x'), y:selectedCharacter.attr('data-y')});

            var newCharacter = thisCell[0].attributes.characters[selectedCharacter.attr('data-index')];
            newCharacter.name = $('#editCharacterName').val().trim();
            newCharacter.description = $('#editCharacterDescription').text();
            newCharacter.additionalInfo = $('#editCharacterAddInfo').text();
            newCharacter.damage = $('#editCharacterDamage').text();
            newCharacter.health = $('#editCharacterHealth').text();
            newCharacter.drops = $('#editCharacterDrops').text();
            thisCell[0].attributes.characters[selectedCharacter.attr('data-index')] = newCharacter;
            thisCell[0].save();
            close();
        };

        dialog = $("#editCharacterDialog").dialog({
            autoOpen: false,
            height: 600,
            width: 525,
            modal: true,
            buttons: {
                "Save": save,
                "Cancel": close
            },
            close: close
        }).css("font-size", "12px");

        form = dialog.find("form").on("submit", function(event) {
            event.preventDefault();
            save();
        });

        $("#editCharacterProperties").click(function() {
            $('#editCharacterName').val($('#characterName').val());
            $('#editCharacterType').val($('#characterType').text());
            $('#editCharacterDescription').val($('#characterDescription').text());
            $('#editCharacterAddInfo').val($('#characterAddInfo').text());
            $('#editCharacterDamage').val($('#characterDamage').text());
            $('#editCharacterHealth').val($('#characterHealth').text());
            $('#editCharacterDrops').val($('#characterDrops').text());
            dialog.dialog("open");
        });
    });

    // The edit objective dialog.
    $(function() {
        var dialog, form,
            type = $("#objectiveChoice"),
            allFields = $([]).add(type);

        function save() {
            var target = $('#objectiveParamsPanel');
            var paramNames = target.find('td.detailsHeading');
            var paramValues = target.find('td input');
            var saveParams = [];
            $.each(paramNames, function(index) {
                saveParams.push({
                    name: $(paramNames[index]).text(),
                    value: $(paramValues[index]).val()
                });
            });

            // At present all objectives require parameters of some kind.
            if (saveParams.length === 0) {
               return;
            }

            var selection = $('#objectiveChoice').find('option:selected');
            var objectiveType = selection.text();
            var description = selection.attr('title');
            var module = selection.attr('data-module');
            var filename = selection.attr('data-filename');

            // Do some basic validation of some of the default objective types.
            // Since objectives are now defined by plugins, custom objectives
            // must be validated on the server.
            if (objectiveType === "Start at" || objectiveType === "Navigate to") {
               var thisCell = locations.where({
                  x: saveParams[0].value, y:saveParams[1].value});

               if (thisCell.length === 0) {
                  alert("Invalid map location.");
                  return;
               }
            }

            // Look up some additional info about the objective.

            if (objectiveType === "Start at") {
               // Always put the "start at" objective first in the list to make
               // it clear that it has been set.
               if (realmData.objectives.length > 0 &&
                   realmData.objectives[0].type === "Start at") {
                   realmData.objectives.shift();
               }

               realmData.objectives.unshift({
                  type: objectiveType,
                  description: description,
                  module: module,
                  filename: filename,
                  completed: false,
                  params: saveParams
               });
            } else {
               // Otherwise add it to the end.
               realmData.objectives.push({
                  type: objectiveType,
                  description: description,
                  module: module,
                  filename: filename,
                  completed: false,
                  params: saveParams
               });
            }

            saveRealm(function() {
                dialog.dialog("close");
                displayObjectives();
            });
        }

        dialog = $("#editObjectiveDialog").dialog({
            autoOpen: false,
            height: 600,
            width: 525,
            modal: true,
            buttons: {
                "Save": save,
                Cancel: function() {
                    dialog.dialog("close");
                }
            },
            close: function() {
                form[0].reset();
                allFields.removeClass("ui-state-error");
            }
        }).css("font-size", "12px");

        form = dialog.find("form").on("submit", function(event) {
            event.preventDefault();
            save();
        });

        $("#addObjective").click(function() {
            $(dialog.parent().find(':button')[1]).prop('disabled', true);
            dialog.dialog("open");
        });

        $('#objectiveChoice').change(function() {
            var dropdown = $('#objectiveChoice');
            var selection = dropdown.find('option:selected');

            // Disable the save button if an invalid option is selected.
            if (selection.attr('disabled') === 'disabled') {
               $($(dialog).parent().find(':button')[1]).prop('disabled', true);
            } else {
               $($(dialog).parent().find(':button')[1]).prop('disabled', false);
            }

            var selectedObjectiveType = selection.text();
            var moduleName = selection.attr('data-module');
            var fileName = selection.attr('data-filename');
            var module = objectivePaletteData.modules[moduleName];
            for (var i=0; i<module.length; i++) {
                var file = module[i];
                if (file.filename !== fileName) {
                   continue;
                }

                for (var j=0; j<file.data.length; j++) {
                   if (file.data[j].name === selectedObjectiveType) {
                      var html = "<table>";
                      file.data[j].parameters.forEach(function (param) {
                         html += "<tr><td class='detailsHeading'>" + param.name + "</td>";
                         html += "<td><input type='text'/></td></tr>";
                      });

                      html += "</table>";
                      $('#objectiveParamsPanel').html(html);
                      return;
                   }
                }
            }

            $('#objectiveParamsPanel').html("");
        });
    });

    $(document).on('click', '.deleteObjective', function(e) {
        var target = $(e.target.closest('tr'));

        if (1 === realmData.objectives.length) {
            realmData.objectives = [];
        } else {
            realmData.objectives.splice(parseInt(target.attr('data-id')), 1);
        }

        saveRealm(function() {
            displayObjectives();
        });
    });

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
                target.attr('data-env', item.attributes.type);
                target.attr('data-id', item.id);
                target.attr('data-module', item.attributes.module);
                target.html('');
                target.append('<img src="images/' + item.attributes.type + '.png" />');

                // To allow it to be dragged to the wastebasket.
                target.addClass('draggable mapItem');
                target.draggable({helper: 'clone', revert: 'invalid'});
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
            target.attr('data-env', item.attributes.type);

            if (item.attributes.startLocation !== undefined) {
                target.attr('data-startLocation', item.attributes.startLocation);
            }

            target.html('');
            target.append('<img src="images/' + item.attributes.type + '.png" />');

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

    $(document).on('mouseenter', '.paletteItem', function() {
        if ($(this).prop('id').length == 0)
            return;

        console.log("mouseenter .paletteItem");
        var tabData = {};
        var activeTab = $('#paletteInnerPanel').tabs('option', 'active');
        switch (activeTab) {
            case PaletteItemType.ENV:
                tabData = {class: activeTab, entries: envPaletteData};
                break;
            case PaletteItemType.ITEM:
                tabData = {class: activeTab, entries: itemPaletteData};
                break;
            case PaletteItemType.CHARACTER:
                tabData = {class: activeTab, entries: characterPaletteData};
                break;
            default:
                console.log("Got invalid active tab " + activeTab);
                return;
        }

        var paletteItem = findPaletteItem(tabData.entries, $(this));
        populatePaletteDetails(tabData.class, paletteItem);
    });

    $(document).on('mouseleave', '.paletteItem', function() {
        console.log("mouseleave .paletteItem");
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
                enableLocationEdits();
            }
        } else if ($(this).attr('data-x') === selectedMapCell.attr('data-x') &&
                   $(this).attr('data-y') === selectedMapCell.attr('data-y')) {
            // Click again in the selected cell to cancel edit mode.
            selectedMapCell.closest('td').css('border-color', '');
            selectedMapCell.removeClass('selected');
            $('#propertiesPanelTitle').text("Location properties");
            disableLocationEdits();
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
            enableLocationEdits();
            console.log("3");
        }
    });

    $(document).on('mouseup', '.propertiesPanelItem', function() {
        var listName = 'itemList';
        var populateFunction = populateLocationItemDetails;
        var clearFunction = clearLocationItemDetails;
        var enableEditsFunction = enableLocationItemEdits;
        var disableEditsFunction = disableLocationItemEdits;
        if ($('#propertiesInnerPanel').tabs('option', 'active') === 2)
        {
            listName = 'characterList';
            populateFunction = populateLocationCharacterDetails;
            clearFunction = clearLocationCharacterDetails;
            enableEditsFunction = enableLocationCharacterEdits;
            disableEditsFunction = disableLocationCharacterEdits;
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
                enableEditsFunction();
            }
        } else if ($(this).attr('data-id') === selectedItem.attr('data-id')) {
            // Click again in the selected item to cancel edit mode.
            selectedItem.closest('div').css('border-color', '');
            selectedItem.removeClass('selected');
            clearFunction();
            disableEditsFunction();
        } else if ($(this).attr('data-id') !== selectedItem.attr('data-id')) {
            // Click in a different item to edit it.

            // First deselect the current edit item.
            selectedItem.closest('div').css('border-color', '');
            selectedItem.removeClass('selected');

            // Then activate the new edit item.
            $(this).closest('div').css('border-color', 'red');
            $(this).addClass('selected');
            populateFunction($(this));
            enableEditsFunction();
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
        var thisCell = locations.where({
            x: selectedItem.attr('data-x'), y:selectedItem.attr('data-y')});

        var newItem = thisCell[0].attributes.items[selectedItem.attr('data-index')];
        newItem.name = $('#itemName').val().trim();
        newItem.description = $('#itemDescription').text();
        newItem.damage = $('#itemDamage').text();
        thisCell[0].attributes.items[selectedItem.attr('data-index')] = newItem;
        thisCell[0].save();
    });

    $(document).on('change', '.characterProperty', function() {
        console.log("characterProperty change");
        var selectedCharacter = $('#characterList').find(".propertiesPanelItem.selected");
        var thisCell = locations.where({
            x: selectedCharacter.attr('data-x'), y:selectedCharacter.attr('data-y')});

        var newCharacter = thisCell[0].attributes.characters[selectedCharacter.attr('data-index')];
        newCharacter.name = $('#characterName').val().trim();
        newCharacter.description = $('#characterDescription').text();
        newCharacter.additionalInfo = $('#characterAddInfo').text();
        newCharacter.damage = $('#characterDamage').text();
        newCharacter.health = $('#characterHealth').text();
        newCharacter.drops = $('#characterDrops').text();
        thisCell[0].attributes.characters[selectedCharacter.attr('data-index')] = newCharacter;
        thisCell[0].save();
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
    realmWidth = parseInt(realmWidth);
    realmHeight = parseInt(realmHeight);

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
        type: environment,
        module: droppedItem.attr('data-module'),
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


function moveToWasteBasket(locations, droppedItem)
{
    console.log("Dropped item onto wastebasket");
    if (droppedItem.is('.mapItem')) {
        removeMapLocation(locations, droppedItem.attr('data-x'), droppedItem.attr('data-y'));
    }
    else if (droppedItem.is('.propertiesPanelItem')) {
        if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
            removeItemFromLocation(locations, droppedItem);
        }
        else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2) {
            removeCharacterFromLocation(locations, droppedItem);
        }
    }
}


function droppedMapItem(realmId, locations, droppedItem, target)
{
    console.log("Dropped item onto map");
    var droppedItemOriginalLocation = locations.where({
        x: droppedItem.attr('data-x'), y:droppedItem.attr('data-y')});

    var droppedItemNewLocation = locations.where({
        x: target.attr('data-x'), y:target.attr('data-y')});

    if (droppedItemNewLocation.length === 0) {
        // Dropped an item onto an empty map location.
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


function removeItemFromLocation(collection, droppedItem)
{
    var thisCell = collection.where({
        x: droppedItem.attr('data-x'), y:droppedItem.attr('data-y')});

    thisCell[0].attributes.items.splice(droppedItem.attr('data-index'), 1);
    thisCell[0].save();
}


function changeItemLocation(collection, droppedItem, newLocation)
{
    var originalLocation = collection.where({id: $('#propertiesPanel').attr('data-id')});
    var originalLocationItems = originalLocation[0].attributes['items'];
    var originalLocationItemIndex = droppedItem.attr('data-index');

    // Add the selected item to the new location.
    newLocation[0].attributes['items'].push(originalLocationItems[originalLocationItemIndex]);
    // Remove it from the original location.
    originalLocationItems.splice(originalLocationItemIndex, 1);

    originalLocation[0].save();
    newLocation[0].save();
}


function addItemToLocation(droppedItem, location)
{
    var fullItemDetails = findPaletteItem(itemPaletteData, droppedItem);
    location[0].attributes.items.push(
        {
            type: droppedItem.attr('data-type'),
            module: droppedItem.attr('data-module'),
            name: '',
            description: fullItemDetails.description,
            damage: fullItemDetails.damage,
            image: droppedItem.find('img').attr('src')
        }
    );

    location[0].save();
}


function removeCharacterFromLocation(collection, droppedItem)
{
    var thisCell = collection.where({
        x: droppedItem.attr('data-x'), y:droppedItem.attr('data-y')});

    thisCell[0].attributes.characters.splice(droppedItem.attr('data-index'), 1);
    thisCell[0].save();
}


function changeCharacterLocation(collection, droppedItem, newLocation)
{
    var originalLocation = collection.where({id: $('#propertiesPanel').attr('data-id')});
    var originalLocationCharacters = originalLocation[0].attributes['characters'];
    var originalLocationCharacterIndex = droppedItem.attr('data-index');

    // Add the selected item to the new location.
    newLocation[0].attributes['characters'].push(originalLocationCharacters[originalLocationCharacterIndex]);
    // Remove it from the original location.
    originalLocationCharacters.splice(originalLocationCharacterIndex, 1);

    originalLocation[0].save();
    newLocation[0].save();
}


function addCharacterToLocation(droppedCharacter, location)
{
   var fullCharacterDetails = findPaletteItem(characterPaletteData, droppedCharacter);
    location[0].attributes.characters.push(
        {
            type: droppedCharacter.attr('data-type'),
            module: droppedCharacter.attr('data-module'),
            name: '',
            description: fullCharacterDetails.description,
            additionalInfo: fullCharacterDetails.additional_info,
            damage: fullCharacterDetails.damage,
            health: fullCharacterDetails.health,
            drops: fullCharacterDetails.drops,
            image: droppedCharacter.find('img').attr('src'),
            npc: true
        }
    );

    location[0].save();
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
    switch (activeTab) {
        case PaletteItemType.ENV:
            $('#paletteEnvType').text('');
            $('#paletteEnvDescription').text('');
            break;

        case PaletteItemType.ITEM:
            $('#paletteItemType').text('');
            $('#paletteItemDescription').text('');
            $('#paletteItemDamage').text('');
            break;

        case PaletteItemType.CHARACTER:
            $('#paletteCharacterType').text('');
            $('#paletteCharacterDescription').text('');
            $('#paletteCharacterAddInfo').text('');
            $('#paletteCharacterHealth').text('');
            $('#paletteCharacterDamage').text('');
            $('#paletteCharacterDrops').text('');
            break;

        default:
            console.log("Got invalid active tab " + activeTab);
    }
}


function disableLocationItemEdits()
{
    $('#itemName').prop('disabled', true);
    $('#itemType').prop('disabled', true);
    $('#itemDescription').prop('disabled', true);
    $('#editItemProperties').prop('disabled', true).attr('src', 'images/pencil43-disabled.png');
}


function enableLocationItemEdits()
{
    $('#itemName').prop('disabled', false);
    $('#itemType').prop('disabled', false);
    $('#itemDescription').prop('disabled', false);
    $('#editItemProperties').prop('disabled', false).attr('src', 'images/pencil43.png');
}


function populateLocationItemDetails(item)
{
    $('#itemIndex').val(item.attr('data-index'));
    $('#itemName').val(item.attr('data-name'));
    $('#itemType').text(item.attr('data-type'));
    $('#itemDescription').text(item.attr('data-description'));
    $('#itemDamage').text(item.attr('data-damage'));
}


function clearLocationItemDetails(item)
{
    $('#itemName').val('');
    $('#itemType').text('');
    $('#itemDescription').text('');
}


function enableLocationCharacterEdits()
{
    $('#characterName').prop('disabled', false);
    $('#editCharacterProperties').prop('disabled', false).attr('src', 'images/pencil43.png');
}


function disableLocationCharacterEdits()
{
    $('#characterName').prop('disabled', true);
    $('#editCharacterProperties').prop('disabled', true).attr('src', 'images/pencil43-disabled.png');
}


function populateLocationCharacterDetails(character)
{
    $('#characterIndex').val(character.attr('data-index'));
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
    $('#characterName').val('');
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


function disableLocationEdits()
{
    $('#locationName').prop('disabled', true);
}


function enableLocationEdits()
{
    $('#locationName').prop('disabled', false);
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
    $('#envType').text(location.attributes.type);
    $('#characterSummary').text(location.attributes.characters.length);
    $('#itemSummary').text(location.attributes.items.length);

    disableLocationEdits();

    displayLocationItems(location);
    displayLocationCharacters(location);
    disableLocationItemEdits();
    disableLocationCharacterEdits();
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


function findPaletteItem(dataSet, itemToFind) {
    var moduleName = itemToFind.attr('data-module');
    var moduleContents = dataSet.modules[moduleName];

    if (moduleContents === undefined) {
       return null; // The module name was not found
    }

    for (var i = 0, len = moduleContents.length; i < len; i++) {
        var thisContent = moduleContents[i];
        if (thisContent.filename === itemToFind.attr('data-filename')) {
           for (var j = 0; j < thisContent.data.length; j++) {
               var thisData = thisContent.data[j];
               if (thisData.type === itemToFind.attr('data-type')) {
                  return thisData; // Return as soon as the object is found
               }
           }
        }
    }

    return null; // The object was not found
}


function loadEnvPalette(callback) {
    $.get(
        '/loadEnvPalette',
        function (data) {
            var target = $('#paletteEnvList');
            envPaletteData = data;

            var envNum = 1;
            $.each(envPaletteData.modules, function(module) {
               // Some left padding required to stop the accordion triangle overlapping the text.
               // I'm sure this can be sorted out with css somehow.
               var accordion = $("<h3>&nbsp;&nbsp;&nbsp;" + module + "</h3>");
               accordion.appendTo(target);
               var childContainer = $("<div></div>");
               envPaletteData.modules[module].forEach(function(file) {
                  file.data.forEach(function(item) {
                       var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                       var html = "<div class='paletteItem draggable ui-widget-content' " +
                           "id='env_" + envNum++ + "' " +
                           "data-module='" + module + "' " +
                           "data-filename='" + file.filename + "' " +
                           "data-category='" + envPaletteData.category + "' " +
                           "data-type='" + item.type + "' " +
                           "><img src='" + item.image + "'/>";
                       html += "</div>";
                       var paletteItem = $(html);
                       paletteItem.draggable({helper: 'clone', revert: 'invalid'});
                       paletteItem.appendTo(container);
                       container.appendTo(childContainer);
                  });
                  childContainer.appendTo(target);
               });
            });

            $(target).accordion();
            callback(null);
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        callback("Error loading env data");
    });
}


function loadItemsPalette(callback) {
    $.get(
        '/loadItemsPalette',
        function (data) {
            var target = $('#paletteItemList');
            itemPaletteData = data;

            var itemNum = 1;
            $.each(itemPaletteData.modules, function(module) {
               // Some left padding required to stop the accordion triangle overlapping the text.
               // I'm sure this can be sorted out with css somehow.
               var accordion = $("<h3>&nbsp;&nbsp;&nbsp;" + module + "</h3>");
               accordion.appendTo(target);
               var childContainer = $("<div></div>");
               itemPaletteData.modules[module].forEach(function(file) {
                  file.data.forEach(function(item) {
                       var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                       var html = "<div class='paletteItem draggable ui-widget-content' " +
                           "id='item_" + itemNum++ + "' " +
                           "data-module='" + module + "' " +
                           "data-filename='" + file.filename + "' " +
                           "data-category='" + itemPaletteData.category + "' " +
                           "data-type='" + item.type + "' " +
                           "><img src='" + item.image + "'/>";
                       html += "</div>";
                       var paletteItem = $(html);
                       paletteItem.draggable({helper: 'clone', revert: 'invalid'});
                       paletteItem.appendTo(container);
                       container.appendTo(childContainer);
                  });
                  childContainer.appendTo(target);
               });
            });

            $(target).accordion();
            callback(null);
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        callback("Error loading item data");
    });
}


function loadCharactersPalette(callback) {
    $.get(
        '/loadCharactersPalette',
        function (data) {
            var target = $('#paletteCharactersList');
            characterPaletteData = data;

            var characterNum = 1;
            $.each(characterPaletteData.modules, function(module) {
               // Some left padding required to stop the accordion triangle overlapping the text.
               // I'm sure this can be sorted out with css somehow.
               var accordion = $("<h3>&nbsp;&nbsp;&nbsp;" + module + "</h3>");
               accordion.appendTo(target);
               var childContainer = $("<div></div>");
               characterPaletteData.modules[module].forEach(function(file) {
                  file.data.forEach(function(character) {
                       var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                       var html = "<div class='paletteItem draggable ui-widget-content' " +
                           "id='char_" + characterNum++ + "' " +
                           "data-module='" + module + "' " +
                           "data-filename='" + file.filename + "' " +
                           "data-category='" + characterPaletteData.category + "' " +
                           "data-type='" + character.type + "' " +
                           "><img src='" + character.image + "'/>";
                       html += "</div>";
                       var paletteItem = $(html);
                       paletteItem.draggable({helper: 'clone', revert: 'invalid'});
                       paletteItem.appendTo(container);
                       container.appendTo(childContainer);
                  });
                  childContainer.appendTo(target);
               });
            });

            $(target).accordion();
            callback(null);
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        callback("Error loading character data");
    });
}


function loadObjectivesPalette(callback) {
    $.get(
        '/loadObjectivesPalette',
        function (data) {
            var html = "<option value='choose' title='choose' disabled selected>Choose</option>";
            objectivePaletteData = data;

            $.each(objectivePaletteData.modules, function(module) {
               objectivePaletteData.modules[module].forEach(function(file) {
                  for (var i=0; i<file.data.length; i++) {
                     html += "<option value='" + i + "' ";
                     html += "title='" + file.data[i].description + "' ";
                     html += "data-module='" + module + "' ";
                     html += "data-filename='" + file.filename + "' ";
                     html += ">" + file.data[i].name + "</option>";
                  }
               });
            });

            $('#objectiveChoice').html(html);
            callback(null);
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        callback("Error loading objective data");
    });
}


function displayLocationItems(location)
{
    console.log(Date.now() + ' displayLocationItems at x:' + location.attributes['x'] + " y: " + location.attributes['y']);

    var target = $('#itemList').html("");
    var itemIndex = 0;
    location.attributes.items.forEach(function(item) {
        var container = $("<div style='display: inline-block; padding: 2px;'></div>");
        var html = "<div class='propertiesPanelItem draggable ui-widget-content' " +
            "data-index='" + itemIndex++ + "' " +
            "data-name='" + item.name + "' " +  // eg; "the sword of destiny"
            "data-category='item' " +
            "data-type='" + item.type + "' " +  // eg; "long sword"
            "data-description='" + item.description + "' " +  // eg; "useful for killing orcs"
            "data-damage='" + item.damage + "' " +
            "data-x='" + location.attributes['x'] + "' " +
            "data-y='" + location.attributes['y'] + "' " +
            "><img src='" + item.image + "'/>";
        html += "</div>";
        var locationItem = $(html);
        locationItem.draggable({helper: 'clone', revert: 'invalid'});
        locationItem.appendTo(container);
        container.appendTo(target);
    });

    $('#itemName').prop('disabled', true);
}


function displayLocationCharacters(location)
{
    console.log(Date.now() + ' displayLocationCharacters at x:' + location.attributes['x'] + " y: " + location.attributes['y']);

    var target = $('#characterList').html("");
    var characterIndex = 0;
    location.attributes.characters.forEach(function(character) {
        var container = $("<div style='display: inline-block; padding: 2px;'></div>");
        var html = "<div class='propertiesPanelItem draggable ui-widget-content' " +
            "data-index='" + characterIndex++ + "' " +
            "data-name='" + character.name + "' " +  // eg; "turnip stealer"
            "data-category='character' " +
            "data-type='" + character.type + "' " +  // eg; "iron boar"
            "data-description='" + character.description + "' " +
            "data-additionalInfo='" + character.additionalInfo + "' " +
            "data-health='" + character.health + "' " +
            "data-damage='" + character.damage + "' " +
            "data-drops='" + character.drops + "' " +
            "data-x='" + location.attributes['x'] + "' " +
            "data-y='" + location.attributes['y'] + "' " +
            "><img src='" + character.image + "'/>";
        html += "</div>";
        var locationCharacter = $(html);
        locationCharacter.draggable({helper: 'clone', revert: 'invalid'});
        locationCharacter.appendTo(container);
        container.appendTo(target);
    });

    $('#characterName').prop('disabled', true);
}


function displayObjectiveDetails(item) {
    var description = "";

    $.each(item.params, function(thisParam){
       description += item.params[thisParam].name + ":" + item.params[thisParam].value + ", ";
    });

    description = description.substr(0, description.lastIndexOf(", "));
    return description;
}


function displayObjectives()
{
    console.log(Date.now() + ' displayObjectives');
    var target = $('#objectiveList').html("");
    var html = "";

    var i=0;
    realmData.objectives.forEach(function(item) {
        html += "<tr data-id='" + (i++) + "'>";
        html += "<td class='objectiveName' data-value='" + item.type + "'>" + item.type + "</td>";
        html += "<td class='objectiveDetails'>" + displayObjectiveDetails(item) + "</td>";
        html += "<td><input class='deleteObjective' type='image' src='images/wastebasket.png' alt='Delete' width='14' height='14'></td>";
        html += "</tr>";
    });

    target.append(html);
}


function loadRealm(callback)
{
    console.log(Date.now() + ' loadRealm');

    $.get(
        '/fetchRealm',
        { "id": $('#realmId').val() },
        function (data) {
            realmData = data;
            callback();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });

    // TODO: still required?
    //$('#itemName').prop('disabled', true);
}


function saveRealm(callback)
{
    console.log(Date.now() + ' saveRealm');

    $.post(
        '/saveRealm',
        { "realm": realmData },
        function (data) {
            realmData = data;
            callback();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}

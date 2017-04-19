/**
 * Created by Simon on 28/05/16.
 * This file implements the interactions for the game UI.
 */

// Constants
describeDetailEnum = {
    TERRAIN_ONLY: 0,
    TERRAIN_AND_CONTENTS: 1
};

// Global data

// The game data. This will be retrieved initially and then kept updated
// via socket messages.
var gameData;
var maplocationData;

// Socket management.
// If joining a multiplayer game that is already in progress, you may receive game update
// messages before you have finished processing the initial data-load operations. Set a busy
// flag so that these messages are queued for subsequent processing.
// This can be tested by calling the dummyCommand API as shown below.
var gamesocket;
var messageQueue = [];
var busy = true;

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
    var realmId = $('#realmId').val(); // Really gameId in this context.

    // There's no point in having a backbone collection to only ever run "fetch" on it.
    // The client will fetch the data once at the start and then keep it in syn using the
    // socket messages.

    // Temporarily make it global for debug purposes.
    /*var*/ gamesocket = io.connect();
    gamesocket.on('connect', function socketConnected() {

        // Listen for socket messages from the server
        gamesocket.on(realmId + '-status', function messageReceived(message) {
            messageQueue.push(message);
            console.log("Push message onto queue: " + JSON.stringify(messageQueue));
            if (busy) {
                console.log("Busy, process message later");
            } else {
                console.log("Not busy, process message.");
                processMessages();
            }
        });

        ///////////////////////////////////////////////////////////
        // Here's where you'll want to add any custom logic for
        // when the browser establishes its socket connection to
        // the Sails.js server.
        ///////////////////////////////////////////////////////////
        /*
        console.log(
            '22 Socket is now connected and globally accessible as `socket`.\n' +
            'e.g. to send a GET request to Sails, try \n' +
            '`socket.get("/", function (response) ' +
            '{ console.log(response); })`'
        );
        */
        ///////////////////////////////////////////////////////////


        // Load the realm and call the function below when it has been retrieved.
        // You need to use this callback approach because the AJAX call is
        // asynchronous. This means the code here won't wait for it to complete,
        // so you have to provide a function that can be called when the data is ready.
        loadGame(function() {
            $('#gameName').text("Play Game " + gameData.name);
            $('#playerName').text("Playing as " + gameData.players[0].name);

            loadMaplocations(function() {
                // Configure the map draw mode panel according to the user's preference.
                var mapDrawMode = gameData.players[0].mapDrawMode;
                $('#drawChoice_' + mapDrawMode).prop("checked", true)

                drawMapGrid(gameData.width, gameData.height, mapDrawMode);
                buildMessageArea();
                busy = false;

                processMessages();

                var playerLocation = findPlayerLocation(maplocationData, gameData.players[0].name);
                displayMessage(describeMyLocation(playerLocation));
            });
        });

        // DEBUG
        /*
        {
            // Trigger a command that will send an AJAX reponse and immediately publish a few
            // socket messsages. Ensure that the client is busy and that the messages get
            // queued and are successfully processed later.
            console.log("starting dummycommand");
            $.get(
                '/dummyCommand',
                function (data) {
                    console.log("after dummycommand, starting delay.");
                    setTimeout(function(){
                        console.log("after delay");
                        busy = false;
                        processMessages();
                    }, 10000);
                }
            ).fail(function(res){
                alert("Error: " + JSON.parse(res.responseText).error);
            });
        }
        */
    });

    // Handle game commands
    $('#inputArea').keypress(function(event) {
        if (event.keyCode == 13) {
            var commandTextBox = $('#inputArea');
            var commandText = commandTextBox.val().trim().toLowerCase();
            if (0 === commandText.length) {
                return;
            }

            var playerLocation = findPlayerLocation(maplocationData, $('#playerName').val());
            if (!playerLocation) {
                alert("Could not find player " + $('#playerName').val() + " on the map.");
                return;
            }

            displayMessage(commandText);

            // Some commands can be handled on the client side.
            if (!handleClientSideCommand(playerLocation, commandText)) {
                // This command can't be handled locally. Send to the server.
                $.post(
                    '/gameCommand', {
                        command: commandText,
                        player: $('#playerName').val(),
                        gameId: $('#realmId').val()
                    },
                    function (data) {
                        console.log(data);
                        if (data.error) {
                            displayMessage(escapeHtml(data.message));
                        }
                    }
                ).fail(function (res) {
                    alert("Error: " + res.responseJSON.error);
                });
            }

            commandTextBox.val("");
        }
    });

    // Show / edit map locations
    $(document).on('mouseenter', '#mapPanel', function() {});

    $(document).on('mouseleave', '#mapPanel', function() {});

    $('input[name=drawChoice]').on('change', function changeDrawMode(selectedOption) {
        console.log(selectedOption.target.value);
        gameData.players[0].mapDrawMode = selectedOption.target.value;
        saveGame();
        drawMapGrid(gameData.width, gameData.height, selectedOption.target.value);
        var playerLocation = findPlayerLocation(maplocationData, gameData.players[0].name);
        showPlayerLocation(playerLocation.y, playerLocation.x);
    })
});


//
// Utility functions
//

function processMessages() {
    console.log("starting processMessages()");
    if (busy) {
        console.log("busy. leaving processMessages()");
    }

    while (messageQueue.length > 0) {
        var thisMessage = messageQueue.shift();
        console.log("processing message: " + JSON.stringify(thisMessage));

        if (thisMessage.description.action === "move") {
            processMoveNotification(thisMessage);
        }
        else if (thisMessage.description.action === "take") {
            processTakeNotification(thisMessage);
        }
        else if (thisMessage.description.action === "drop") {
            processDropNotification(thisMessage);
        }
    }
    console.log("finished processMessages()");
}

function processMoveNotification(message) {
    gameData = message.data.game[0];

    if (message.player === gameData.players[0].name) {
        console.log("You have moved to location [" + message.description.to.x + "," + message.description.to.y + "].");
        displayMessage(describeMyLocation(maplocationData[message.description.to.y-1][message.description.to.x-1]));

        var oldLocation = maplocationData[message.description.from.y-1][message.description.from.x-1];
        if (shouldDrawMapLocation(oldLocation)) {
            // Draw the old map location without the player.
            drawMaplocation(oldLocation);
        }

        var newLocation = maplocationData[message.description.to.y-1][message.description.to.x-1];
        if (shouldDrawMapLocation(newLocation)) {
            // Show the player in the new location.
            drawMaplocation(newLocation);
            showPlayerLocation(message.description.to.y, message.description.to.x);
        }
    }
}

function processTakeNotification(message) {
    gameData = message.data.game[0];
    maplocationData[parseInt(message.data.location[0].y)-1][parseInt(message.data.location[0].x)-1] = message.data.location[0];

    if (message.player === gameData.players[0].name) {
        var status = "You have taken a " + message.description.item.type;
        if (message.description.item.name) {
            status = status + " (" + message.description.item.name + ")";
        }
        status = status + ".";

        console.log(status);
        displayMessage(status);

        if (shouldDrawMapLocation(message.data.location[0])) {
            // Show the player in the new location.
            drawMaplocation(message.data.location[0]);
            showPlayerLocation(message.data.location[0].y, message.data.location[0].x);
        }
    }
}

function processDropNotification(message) {
    gameData = message.data.game[0];
    maplocationData[parseInt(message.data.location[0].y)-1][parseInt(message.data.location[0].x)-1] = message.data.location[0];

    if (message.player === gameData.players[0].name) {
        var status = "You have dropped a " + message.description.item.type;
        if (message.description.item.name) {
            status = status + " (" + message.description.item.name + ")";
        }
        status = status + ".";

        console.log(status);
        displayMessage(status);

        if (shouldDrawMapLocation(message.data.location[0])) {
            // Show the player in the new location.
            drawMaplocation(message.data.location[0]);
            showPlayerLocation(message.data.location[0].y, message.data.location[0].x);
        }
    }
}

function loadGame(callback) {
    console.log(Date.now() + ' loadGame');

    $.get(
        '/fetchGame',
        { "id": $('#realmId').val() },
        function (data) {
            gameData = data;
            callback();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}

function saveGame() {
    console.log(Date.now() + ' saveGame');

    $.post(
        '/saveGame',
        {gameData: gameData},
        function (data) {
            console.log(data);
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}

function loadMaplocations(callback) {
    console.log(Date.now() + ' loadMaplocations');

    $.get(
        '/maplocation?realmId=' + $('#realmId').val(),
        function (data) {
            // Make a sparse array for the map area.
            maplocationData = new Array(parseInt(gameData.height));
            $.each(data, function(index, item) {
                console.log("iter: " + JSON.stringify(item));

                if (maplocationData[parseInt(item.y)-1] === undefined) {
                    maplocationData[parseInt(item.y)-1] = new Array(parseInt(gameData.width));
                }
                maplocationData[parseInt(item.y)-1][parseInt(item.x)-1] = item;
            });

            callback();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}

function drawMapGrid(realmWidth, realmHeight, mapDrawMode) {
    var mapTable = $('#mapTable');
    var tableContents = '';

    /* Draw the empty grid with axis labels.

       Being an html table, it has to be drawn from the top left to
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

    // Now draw all the data initially.
    for (var y=0; y<realmHeight; y++) {
        var thisRow = maplocationData[y];
        if (thisRow !== undefined) {
            for (var x = 0; x < realmWidth; x++) {
                var location = thisRow[x];
                if (thisRow[x] !== undefined && shouldDrawMapLocation(location)) {
                    drawMaplocation(location);
                }
            }
        }
    }
}

function drawMaplocation(locationData) {
    var target = $('#mapTable td[id="cell_' + locationData.x + '_' + locationData.y + '"]').find('div');
    target.attr('data-id', locationData.id);
    target.addClass('terrainCell');
    var html = '';

    var playerName = $('#playerName').val();
    if (shouldDrawMapLocation(locationData)) {
        // Always show the terrain once the player has visited the location, as terrain never changes.
        target.attr('data-env', locationData.type);
        html += '<img src="images/' + locationData.type + '.png" style="position:absolute" />';

        // TODO: decide whether the maplocation's items and characters remain permanently visible, or
        // only visible when the player is in the location.
        // For now show the details if the player has visited the location.
        if (locationData.characters.length > 0) {
            html += '<img src="images/other-character-icon.png" style="position:absolute; margin-left: 1em">';
        }

        if (locationData.items.length > 0) {
            html += '<img src="images/object-icon.png" style="position:absolute; margin-left: 2em; margin-top: 1em">';
        }
    }

    target.html(html);
}

// Decide whether to show a maplocation depending on thr mapdraw mode.
function shouldDrawMapLocation(locationData) {
    var playerName = $('#playerName').val();

    // The list of locations the player has visited is a dictionary for
    // quick searching when drawing the map. Using a list
    // will scale badly when drawing the whole map.
    var visitedKey = locationData.x.toString() + "_" + locationData.y.toString();
    var playerVistitedLocation = (visitedKey in gameData.players[0].visited);
    var mapDrawMode = gameData.players[0].mapDrawMode;
    if (("autoAll" == mapDrawMode) || ("autoVisited" == mapDrawMode && playerVistitedLocation)) {
        return true;
    }

    return false;
}

function showPlayerLocation(y, x) {
    var location = maplocationData[y-1][x-1];

    if (shouldDrawMapLocation(location)) {
        var target = $('#mapTable td[id="cell_' + x + '_' + y + '"]').find('div');
        var html = target.html();
        html += '<img src="images/player-icon.png" style="position:absolute">';
        target.html(html);
    }
}

function buildMessageArea() {
    var html = "";
    var numRows = 25;
    for (var row=0; row <numRows; row++) {
        html += "<tr><td><input class='messageRow' size='80' readonly /></td></tr>";
    }

    $('#messageTable').html(html);
}

function wordbreak(message) {
    var tmp = message.substring(0, 80);
    var lastSpace = tmp.lastIndexOf(" ");
    return message.substring(0, lastSpace);
}

// Display a message a briefly highlight it in the message table.
function displayMessage(message) {
    displayMessageImpl(message);
    setTimeout(function() { $('.messageRow.newMessage').removeClass('newMessage').addClass('oldMessage'); }, 1000);
}

function displayMessageImpl(message, continuation) {
    if (message.length > 80) {
        var msgFragment = wordbreak(message);
        displayMessageImpl(msgFragment);
        while ((message.length - msgFragment.length) > 0) {
            message = message.substring(msgFragment.length, msgFragment.length + 80);
            displayMessageImpl(message, true);
        }
    } else {
        var table = $('#messageTable');
        var topRow = table.find('tr:first');
        var bottomRowTextField = table.find('tr:last input');

        if (0 === bottomRowTextField.val().length) {
            bottomRowTextField.val(">\t" + message);
            bottomRowTextField.addClass('messageRow newMessage');
        } else {
            topRow.remove();
            table.append("<tr><td><input class='messageRow newMessage' size='80' readonly value='>\t" + message + "'/></td></tr>");
        }
    }
}

function findPlayerLocation(locations, playerName) {
    var playerLocation = null;

    $.each(gameData.players, function(index, player) {
        if (player.name === playerName) {
            var location = maplocationData[parseInt(player.location.y)-1][parseInt(player.location.x)-1];

            if (location !== undefined)
                playerLocation = location;

            return false;
        }
    });

    return playerLocation;
}

function describeLocationContents(location, detailLevel) {
    var message = "";

    if (detailLevel >= describeDetailEnum.TERRAIN_AND_CONTENTS) {
        // TODO: format the list better. Say "two dwarves" rather than "a dwarf and a dwarf".
        var numCharacters = location.characters.length;
        if (numCharacters > 0) {
            message += " There is a ";
            for (var i = 0; i < numCharacters; i++) {
                message += location.characters[i].type;
                if (i < numCharacters - 2) {
                    message += ", a ";
                } else if (i == numCharacters - 2) {
                    message += ", and a ";
                }
            }
            message += ". ";
        }

        var numItems = location.items.length;
        if (numItems > 0) {
            message += " There is a ";
            for (var i = 0; i < numItems; i++) {
                message += location.items[i].type;
                if (i < numItems - 2) {
                    message += ", a ";
                } else if (i == numItems - 2) {
                    message += ", and a ";
                }
            }
            message += ".";
        }
    }

    return message;
}

function describeLocation(location, detailLevel) {
    var message = "Terrain: " + location.type + ".";
    message += describeLocationContents(location, detailLevel);
    return message;
}

function describeMyLocation(location) {
    showPlayerLocation(location.y, location.x);
    var message = "You are at location [" + location.x + ", " + location.y + "]. Terrain: " + location.type + ".";
    message += describeLocationContents(location, describeDetailEnum.TERRAIN_AND_CONTENTS);
    return message;
}

// If the client has the data then certain commands can be fulfilled locally.
function handleClientSideCommand(playerLocation, commandText) {
    var tokens = commandText.split(" ");
    if (tokens[0] === "help") {
        handleHelp();
        return true;
    }
    else if (tokens[0] === "look") {
        handleLook(playerLocation, tokens);
        return true;
    }
    else if (tokens[0] === "inventory") {
        handleInventory(playerLocation, tokens);
        return true;
    }

    return false;
}

function handleHelp() {
    displayMessage("Commands:");
    displayMessage("   help: display list of commands.");
    displayMessage("   look [direction]: describe the adjacent location in the specified direction, or the current location if no direction specified.");
    displayMessage("   move direction: move in the specified direction if possible.");
    displayMessage("   take item: take the named item. e.g. \"take short sword\".");
    displayMessage("   drop item: drop the named item. e.g. \"drop short sword\".");
    displayMessage("   inventory: list the items in your inventory.");
}

function handleLook(playerLocation, tokens) {
    // "Look" without a direction refers to the current location.
    if (1 === tokens.length) {
        displayMessage(describeMyLocation(playerLocation));
        return true;
    }
    else {
        var deltaX = 0;
        var deltaY = 0;

        switch(tokens[1]) {
            case "north":
                deltaY = 1;
                break;
            case "northeast":
                deltaX = 1;
                deltaY = 1;
                break;
            case "east":
                deltaX = 1;
                break;
            case "southeast":
                deltaX = 1;
                deltaY = -1;
                break;
            case "south":
                deltaY = -1;
                break;
            case "southwest":
                deltaX = -1;
                deltaY = -1;
                break;
            case "west":
                deltaX = -1;
                break;
            case "northwest":
                deltaX = -1;
                deltaY = 1;
                break;
            default:
                var errorMessage = "Unknown direction " + tokens[1];
                displayMessage(errorMessage);
                return false;
        }

        // Does the requested location exist? First get the current player location.
        var originalX = parseInt(playerLocation.x);
        var originalY = parseInt(playerLocation.y);
        var newX = originalX + deltaX;
        var newY = originalY + deltaY;
        console.log("searching for location [" + newX + ", " + newY + "].");

        if (!locationExists(newY -1, newX -1)) {
            var errorMessage = "That direction is beyond the edge of the world.";
            displayMessage(errorMessage);
            return false;
        }

        var newLocation = maplocationData[newY -1][newX -1];
        displayMessage(describeLocation(newLocation, describeDetailEnum.TERRAIN_ONLY));
        return true;
    }
}

function locationExists(y, x) {
    if (maplocationData[y] === undefined)
        return false;

    if (maplocationData[y][x] === undefined)
        return false;

    return true;
}

function handleInventory(playerLocation, tokens) {
    // For now the assumption is that you are playing as gameData.players[0].
    // This will not be true when we support multi-player mode.
    var inventory = gameData.players[0].inventory;
    if (undefined !== inventory && 0 != inventory.length) {
        var message = "You have ";
        $.each(inventory, function (index, item) {
            message += item.type;
            if (item.name) {
                message = message + " (" + item.name + ")";
            }
            message += ", ";
        });
        displayMessage(message.substring(0, message.lastIndexOf(", ")));
    }
    else {
        displayMessage("There are no items in your inventory.");
    }
}

// escapeHtml implementation taken from mustache.js
// https://github.com/janl/mustache.js/blob/eae8aa3ba9396bd994f2d5bbe3b9fc14d702a7c2/mustache.js#L60
var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}

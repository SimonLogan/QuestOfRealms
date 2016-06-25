/**
 * Created by Simon on 05/02/14.
 * This file implements the interactions for the QuestOfRealms main page.
 */

// When the page has finished rendering...
$(document).ready(function() {
    // Fetch existing realm designs and games. This will populate the tables.
    loadRealmDesigns();
    loadGames();

    // Allow creation of new realm designs by handling clicks on the "New Realm Design" button.
    // The jQuery selector $('#showCreateRealmDesignButton') selects the button by its "id" attribute.
    $('#showCreateRealmDesignButton').click(function() {
        // $(this) is the button you just clicked.
        $(this).hide();
        $('#realmDesignContainer').show();
        $('#createButton').prop('disabled', false);
    });

    // Handle clicking the "Create!" button on the "New Realm Design" form.
    $('#createRealmButton').click(function() {
        createRealmDesign();
    });
});


// Load the details of the existing realm designs from the server using the "/fetchRealms" API.
// This URL is mapped to a controller on the server using a route in config/routes.js which tells
// sails that a call to "/fetchRealms" should call the fetchRealms() function in QuestRealmController.js:
//    '/fetchRealms' : {
//        controller: 'questRealm',
//            action: 'fetchRealms'
//    },
function loadRealmDesigns() {
    // Use jQuery to send an AJAX GET request to the server.
    $.get(
        // using the URL
        '/fetchRealms',
        // and when the server has a result it should call this function and pass the result
        // in the "data" parameter.
        function (data) {
            // Create the body of the "Realm Designs" table.
            var header = "<table class='realmList'>";
            header += "<tr><th class='realmListName'>Name</th>";
            header += "<th class='realmListDescription'>Description</th>";
            header += "<th>Create Date</th>";
            header += "<th>Edit</th>";
            header += "<th>Delete</th>";
            header += "<th>Create Game</th></tr>";

            // Add a row to the table for each realm that the server sent back.
            var row = 0;
            var body = "";
            // data.forEach() is a jQuery function for iterating over a data set.
            // For each item in the data, it will call this function, passing the
            // item in as the "item" parameter.
            data.forEach(function(item) {
                var rowClass = "realmListOddRow";

                // Make even numbered table rows a different colour.
                if (0 == (++row % 2)) rowClass = "realmListEvenRow";
                body += "<tr id='" + item.id + "' class='" + rowClass + "'>";
                body += "<td>" + item.name + "</td>";
                body += "<td>" + item.description + "</td>";
                body += "<td>" + item.updatedAt + "</td>";
                body += "<td><input type='button' class='editRealmDesign' value='Edit'/></td>";
                body += "<td><input type='button' class='deleteRealmDesign' value='Delete'/></td>";
                body += "<td><input type='button' class='launchGameWizard' value='Create Game'/></td>";
                body += "</tr>";
            });

            // Don't show the table if there are no existing realm designs.
            if (0 == row) {
                $('#realmDesignsPanel').hide();
            } else {
                $('#realmDesignsPanel').show();
            }

            // Remove the current contents of the table. A jQuery selector $('#XXX')
            // selects an HTML element using its 'id' attribute.
            $('#realmList').html("");
            // Remove the click handlers the various buttons, as we'll be registering new handler
            // functions below. Failing to do this will result in the handlers being called multiple
            // times when you click the buttons.
            // A jQuery selector $('.XXX') selects an HTML element by its 'class' attribute.
            // Unlike id, class doesn't have to be unique so the selectors below will select all
            // buttons on the page with the given classes.
            $('.editRealmDesign').off();
            $('.deleteRealmDesign').off();
            $('.launchGameWizard').off();

            if (body.length > 0) {
                // Add the new rows to the table.
                $('#realmList').html(header + body);

                // Now add the new handler functions for the buttons on the new table rows.
                $('.editRealmDesign').on('click', function () {
                    editRealmDesign($(this));
                });

                $('.deleteRealmDesign').on('click', function () {
                    deleteRealmDesign($(this));
                });

                $('.launchGameWizard').on('click', function () {
                    launchGameWizard($(this));
                });
            }
        }
    // If the AJAX call fails it should call this function.
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}


// Load the details of the existing games from the server using the "/fetchGames" API.
// See the comments on the loadRealmDesigns() function for a detailed function walkthrough.
function loadGames() {
    $.get(
        '/fetchGames',
        function (data) {
            var header = "<table class='realmList'>";
            header += "<tr><th class='realmListName'>Name</th>";
            header += "<th class='realmListDescription'>Description</th>";
            header += "<th>Create Date</th>";
            header += "<th>Delete</th>";
            header += "<th>Play</th></tr>";

            var row = 0;
            var body = "";
            data.forEach(function(game) {
                var rowClass = "realmListOddRow";
                if (0 == (++row % 2)) rowClass = "realmListEvenRow";
                body += "<tr id='" + game.id + "' class='" + rowClass + "'>";
                body += "<td>" + game.name + "</td>";
                body += "<td>" + game.description + "</td>";
                body += "<td>" + game.updatedAt + "</td>";
                body += "<td><input type='button' class='deleteGame' value='Delete'/></td>";
                body += "<td><input type='button' class='playGame' value='Play'/></td>";
                body += "</tr>";
            });

            if (0 == row) {
                $('#gamesPanel').hide();
            } else {
                $('#gamesPanel').show();
            }

            $('#gameList').html("");
            $('.deleteGame').off();

            if (body.length > 0) {
                $('#gameList').html(header + body);

                $('.deleteGame').on('click', function () {
                    deleteGame($(this));
                });

                $('.playGame').on('click', function () {
                    playGame($(this));
                });
            }
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}


// The "Edit" button was clicked on one of the Realm Designs table rows.
function editRealmDesign(target) {
    // Build a URL to invoke the realm editor, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>".
    // "window.location =" will redirect the user to the new web page. In this case
    // the "/editRealm" route will render the questRealm/editRealm view instead of returning
    // JSON data. This view will pass the realm data to views/questRealm/editRealm.ejs
    // where it can be referenced using template parameters when drawing the page.
    window.location = "/editRealm?id=" + target.closest('tr').attr('id');
}


// The "Delete" button was clicked on one of the Realm Designs table rows.
function deleteRealmDesign(target) {
    // The name of the realm is contained in one of the other <td> elements
    // of the row that contains the button that was clicked. Since this is a
    // sibling of the <td> that contained the button, we use $(target.closest('tr')
    // to find the parent of the button's <td> and then search all its children
    // looking for its first <td> element, and taking the text it contains.
    var name = $(target.closest('tr').find('td')[0]).text();
    // Similar use of a jQuery selector to find the id of the realm to delete.
    var id = target.closest('tr').attr('id');

    // Show a dialog with "OK" and "Cancel" buttons. If you click "OK" it will call the
    // function below.
    if (confirm("Are you sure you want to delete realm " + name)) {
        // Submit an AJAX POST request to the "/deleteRealm" route.
        $.post(
            '/deleteRealm',
            // passing in the id of the realm to delete.
            {id: id},
            // and when it completes, call this function.
            function (data) {
                // to re-display the Realm Designs table.
                loadRealmDesigns();
            }
        ).fail(function(res){
            // There was an error. Display a dialog to show it.
            alert("Error: " + JSON.parse(res.responseText).error);
        });
    }
}


// The "Create!" button on the "New Realm Design" form was pressed.
function createRealmDesign() {
    // Select the values the user supplied using the id attributes of the relevant
    // screen fields.
    var realmName = $('#realmName').val().trim();
    var realmDesc = $('#realmDescription').val().trim();
    var realmWidth = $('#realmWidth').val();
    var realmHeight = $('#realmHeight').val();

    // Submit an AJAX POST request to create the realm.
    $.post(
        '/createRealm',
        // passing in the required information
        {
            name: realmName,
            description: realmDesc,
            width: realmWidth,
            height: realmHeight
        },
        // and if the creation is successful, launch the realm editor for the new realm.
        function (data) {
            window.location = '/editRealm?id=' + data.id;
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}


// The "Create Game" button was pressed on a row in the "Realm Designs" table.
function launchGameWizard(target) {
    // Get the id of the realm to use for creating the new game. Use the jQuery
    // selector target.closest('tr') to find the parent <tr> of the row that contained
    // the button, and get its id.
    var parentRealmId = target.closest('tr').attr('id');
    $('#createGamePanel').show();

    // Remove existing click handlers for the "Create!" button on the New Game panel
    // (to avoid multiple calls when you press the button)
    $('#createGameButton').off();
    // and add a new handler function.
    $('#createGameButton').on('click', function () {
        createGame(parentRealmId);
    });
}


// Create a new Game based on the specified parent realm. The server will clone the realm to make
// a new playable game.
function createGame(parentRealmId) {
    var gameName = $('#gameName').val().trim();
    var gameDesc = $('#gameDescription').val().trim();

    $.post(
        '/createGame',
        {
            name: gameName,
            description: gameDesc,
            parentRealmId: parentRealmId
        },
        function (data) {
            cleanAndHideCreateGamePanel();
            loadGames();
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}


// Clear any data that was typed into the "Create Game" form so that it is
// blank the next time it is displayed.
function cleanAndHideCreateGamePanel()
{
    // Select the panel using its 'id' attribute.
    var panel = $('#createGamePanel');
    panel.hide();
    // Find all the text fields on the panel and clear their contents.
    panel.find('input[type=text]').val('');
}


// The "Delete" button was pressed on a row in the "Games" table.
function deleteGame(target) {
    // Find the name and id of the game in question by navigating to the
    // relevent form elements. See the explanations of jQuery selectors
    // above for more details.
    var name = $(target.closest('tr').find('td')[0]).text();
    var id = target.closest('tr').attr('id');
    if (confirm("Are you sure you want to delete game " + name)) {
        $.post(
            '/deleteGame',
            {id: id},
            function (data) {
                loadGames();
            }
        ).fail(function(res){
            alert("Error: " + JSON.parse(res.responseText).error);
        });
    }
}


// The "Play" button was clicked on one of the Game table rows.
function playGame(target) {
    // Build a URL to invoke the game, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>".
    // "window.location =" will redirect the user to the new web page. In this case
    // the "/editRealm" route will render the questRealm/editRealm view instead of returning
    // JSON data. This view will pass the realm data to views/questRealm/editRealm.ejs
    // where it can be referenced using template parameters when drawing the page.
    window.location = "/playGame?id=" + target.closest('tr').attr('id');
}

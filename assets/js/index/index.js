/**
 * Created by Simon on 05/02/14.
 * This file implements the interactions for the QuestOfRealms main page.
 */

var availableRealms = {};

// When the page has finished rendering...
$(document).ready(function() {
   // Fetch existing realm designs and games. This will populate the tables.
   //loadRealms();
   //loadGames();

   // Load the game and avaialble relams and call the functions below when they have been
   // retrieved. You need to use this callback approach because the AJAX calls are
   // asynchronous. This means the code here won't wait for them to complete,
   // so you have to provide a function that can be called when the data is ready.
   async.parallel([
       function(callback) {
          loadAndDisplayAvailableRealms(callback);
       },
       function(callback) {
          loadGames(callback);
       },
       function(callback) {
          loadGameInstances(callback);
       },
   ],
   function(err, results) {
      if (!err) enableControls();
   });

   // Allow creation of new games by handling clicks on the "New Game" button.
   // The jQuery selector $('#showCreateGameButton') selects the button by its "id" attribute.
   $('#showCreateGameButton').click(function() {
      // $(this) is the button you just clicked.
      $(this).hide();
      $('#createGamePanel').show();
      $('#createGameButton').prop('disabled', false);
   });

   // Handle clicking the "Create!" button on the "New game" form.
   $('#createGameButton').click(function() {
      createGame()
   });

   // Handle clicking the "Create!" button on the "New game instance" form.
   $('#createGameInstanceButton').click(function() {
      createGameInstance()
   });
});


//
// Utility functions
//

function enableControls() {

    // Allow creation of new realms by handling clicks on the "New Realm" button.
    // The jQuery selector $('#showCreateRealmDesignButton') selects the button by its "id" attribute.
    $('#showCreateRealmDesignButton').click(function() {
        // $(this) is the button you just clicked.
        $(this).hide();
        $('#realmDesignContainer').show();
        $('#createRealmButton').prop('disabled', false);
    });

     // Handle clicking the "Create!" button on the "New Realm" form.
    $('#createRealmButton').click(function() {
        createRealmDesign();
    });
}


// CLONED FROM gameEditor.js
// Load the details of the existing realms from the server using the "/fetchRealms" API.
// This URL is mapped to a controller on the server using a route in config/routes.js which tells
// sails that a call to "/fetchRealms" should call the fetchRealms() function in QuestRealmController.js:
//    '/fetchRealms' : {
//        controller: 'questRealm',
//            action: 'fetchRealms'
//    }
function loadAndDisplayAvailableRealms(callback) {
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

            // Removae any existing "add" button click handlers.
            $('.editRealmDesign').off();
            $('.deleteRealmDesign').off();
            $('.addToGame').off();

            // Add a row to the table for each realm that the server sent back.
            var row = 0;
            var body = "";
            for (var i = 0; i < data.length; i++) {
                availableRealms[data[i].id] = data[i];

                var rowClass = "realmListOddRow";

                // Make even numbered table rows a different colour.
                if (0 == (++row % 2)) rowClass = "realmListEvenRow";
                body += "<tr id='" + data[i].id + "' class='" + rowClass + "'>";
                body += "<td>" + data[i].name + "</td>";
                body += "<td>" + data[i].description + "</td>";
                body += "<td>" + data[i].updatedAt + "</td>";
                body += "<td><input type='button' class='editRealmDesign' value='Edit'/></td>";
                body += "<td><input type='button' class='deleteRealmDesign' value='Delete'/></td>";
                body += "</tr>";
            };

            if (body.length === 0) {
                $('#availableRealmsList').html("");
                //$('#realmDesignsPanel').hide();
            } else {
                // A jQuery selector $('#XXX') selects an HTML element using its 'id' attribute.
                $('#availableRealmsList').html(header + body);
                $('#realmDesignsPanel').show();

                // Now add the new handler functions for the buttons on the new table rows.
                $('.editRealmDesign').on('click', function () {
                    editRealmDesign($(this));
                });

                $('.deleteRealmDesign').on('click', function () {
                    deleteRealmDesign($(this));
                });

                $('.addToGame').on('click', function () {
                    addToGame($(this));
                });
            }

            if (callback) callback();
        }
    // If the AJAX call fails it should call this function.
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
        if (callback) callback("Failed to load realms");
    });
}


// Load the details of the existing games from the server using the "/fetchGames" API.
// See the comments on the loadRealmDesigns() function for a detailed function walkthrough.
function loadGames(callback) {
    $.get(
        '/fetchGames',
        function (data) {
            var header = "<table class='realmList'>";
            header += "<tr><th class='realmListName'>Name</th>";
            header += "<th class='realmListDescription'>Description</th>";
            header += "<th>Create Date</th>";
            header += "<th>Edit</th>";
            header += "<th>Delete</th>";
            header += "<th>Action</th></tr>";

            var row = 0;
            var body = "";
            data.forEach(function(game) {
                var rowClass = "realmListOddRow";
                if (0 == (++row % 2)) rowClass = "realmListEvenRow";
                body += "<tr id='" + game.id + "' class='" + rowClass + "'>";
                body += "<td>" + game.name + "</td>";
                body += "<td>" + game.description + "</td>";
                body += "<td>" + game.updatedAt + "</td>";
                body += "<td><input type='button' class='editGame' value='Edit'/></td>";
                body += "<td><input type='button' class='deleteGame' value='Delete'/></td>";
                body += "<td><input type='button' class='createInstance' value='Create Instance'/></td>";
                body += "</tr>";
            });

            $('#gameList').html("");
            $('.editGame').off();
            $('.deleteGame').off();
            $('.createInstance').off();

            if (body.length > 0) {
                $('#gameList').html(header + body);

                $('.editGame').on('click', function () {
                    editGame($(this));
                });

                $('.deleteGame').on('click', function () {
                    deleteGame($(this));
                });

                $('.createInstance').on('click', function () {
                    // Store the id of the game you want to instantiate.
                    // This will be needed later.
                    var templateGameId = $(this).closest('tr').attr('id');
                    $('#newInstanceTemplateGameId').val(templateGameId);
                    $('#createGameInstancePanel').show();
                });
            }

            if (callback) callback();
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
        if (callback) callback("Failed to load games");
    });
}


// Load the details of the existing game instances from the server using the "/fetchGameInstances" API.
// See the comments on the loadRealmDesigns() function for a detailed function walkthrough.
function loadGameInstances(callback) {
    $.get(
        '/fetchGameInstances',
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
                body += "<td><input type='button' class='deleteGameInstance' value='Delete'/></td>";
                body += "<td><input type='button' class='play' value='Play'/></td>";
                body += "</tr>";
            });

            $('#gameInstanceList').html("");
            $('.deleteGameInstance').off();
            $('.play').off();

            if (body.length > 0) {
                $('#gameInstanceList').html(header + body);

                $('.deleteGameInstance').on('click', function () {
                    deleteGame($(this));
                });

                $('.play').on('click', function () {
                    playGame($(this).closest('tr').attr('id'));
                });
            }

            if (callback) callback();
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
        if (callback) callback("Failed to load games");
    });
}


function createGame() {
    var gameName = $('#gameName').val().trim();
    var gameDesc = $('#gameDescription').val().trim();

    $.post(
        '/createGame',
        {
            name: gameName,
            description: gameDesc
        },
        function (data) {
            cleanAndHideCreateGamePanel();
            $('#showCreateGameButton').show();
            loadGames();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        cleanAndHideCreateGamePanel();
        $('#showCreateGameButton').show();
        loadGames();
    });
}


// The "Edit" button was clicked on one of the Games table rows.
function editGame(target) {
    // Build a URL to invoke the game editor, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>".
    // "window.location =" will redirect the user to the new web page. In this case
    // the "/editGame" route (in config/routes.js) will render the questRealm/editGame
    // view instead of returning JSON data. This view will pass the realm data to
    // views/questRealm/editGame.ejs where it can be referenced using template parameters
    // when drawing the page.
    window.location = "/editGame?id=" + target.closest('tr').attr('id');
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


// Clear any data that was typed into the "Create Game Instance" form so that it is
// blank the next time it is displayed.
function cleanAndHideCreateGameInstancePanel()
{
    // Select the panel using its 'id' attribute.
    var panel = $('#createGameInstancePanel');
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
                loadGameInstances();
            }
        ).fail(function(res){
            alert("Error: " + JSON.parse(res.responseText).error);
            loadGames();
            loadGameInstances();
        });
    }
}


function createGameInstance() {
    var templateGameId = $('#newInstanceTemplateGameId').val();
    var gameInstanceName = $('#gameInstanceName').val().trim();
    var playerName = $('#playerName').val().trim();

    $.post(
        '/createGameInstance',
        {
            templateGameId: templateGameId,
            name: gameInstanceName,
            playerName: playerName
        },
        function (data) {
            cleanAndHideCreateGameInstancePanel();
            loadGameInstances();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        cleanAndHideCreateGameInstancePanel();
        loadGameInstances();
    });
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
    window.location = "/playGame?id=" + target;
}

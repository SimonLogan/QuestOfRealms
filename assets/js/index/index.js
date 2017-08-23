/**
 * Created by Simon on 05/02/14.
 * This file implements the interactions for the QuestOfRealms main page.
 */

// When the page has finished rendering...
$(document).ready(function() {
    // Fetch existing realm designs and games. This will populate the tables.
    //loadRealms();
    loadGames();

    // Allow creation of new games by handling clicks on the "New Game" button.
    // The jQuery selector $('#showCreateGameButton') selects the button by its "id" attribute.
    $('#showCreateGameButton').click(function() {
        // $(this) is the button you just clicked.
        $(this).hide();
        $('#gameDesignContainer').show();
        $('#createGameButton').prop('disabled', false);
    });

    // Handle clicking the "Create!" button on the "New game" form.
    $('#createGameButton').click(function() {
        createGame();
    });
});


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
            header += "<th>Edit</th>";
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
                body += "<td><input type='button' class='editGame' value='Edit'/></td>";
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
            $('.editGame').off();
            $('.deleteGame').off();

            if (body.length > 0) {
                $('#gameList').html(header + body);

                $('.editGame').on('click', function () {
                    editGame($(this));
                });

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


function createGame() {
    var gameName = $('#gameName').val().trim();
    var gameDesc = $('#gameDescription').val().trim();
    var playerName = $('#playerName').val().trim();

    $.post(
        '/createGame',
        {
            name: gameName,
            description: gameDesc,
            playerName: playerName
        },
        function (data) {
            cleanAndHideCreateGamePanel();
            loadGames();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        cleanAndHideCreateGamePanel();
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
            loadGames();
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

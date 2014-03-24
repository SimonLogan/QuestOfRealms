/**
 * Created by Simon on 05/02/14.
 */

$(document).ready(function() {
    $('#ShowCreateFormButton').click(function() {
        $('#realmDetailsContainer').show();
        $('#CreateButton').prop('disabled', false);
    });

    $('#CreateButton').click(function() {
        var realmName = $('#realmName').val().trim();
        var realmWidth = $('#realmWidth').val();
        var realmHeight = $('#realmHeight').val();

        $.post(
            '/createRealm',
            {
                name: realmName,
                width: realmWidth,
                height: realmHeight
            },
            function (data) {
                window.location = '/editRealm?name=' + data.name;
            }
        ).fail(function(res){
            alert("Error: " + res.getResponseHeader("error"));
        });
    });
});
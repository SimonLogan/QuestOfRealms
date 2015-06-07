/**
 * Created by Simon on 05/02/14.
 */

$(document).ready(function() {
    // Fetch existing realm designs
    loadRealmDesigns();

    // Allow creation of new realm designs
    $('#showCreateRealmDesignButton').click(function() {
        $(this).hide();
        $('#realmDesignContainer').show();
        $('#createButton').prop('disabled', false);
    });

    $('#createButton').click(function() {
        createRealmDesign();
    });
});


function loadRealmDesigns() {
    $.get(
        '/fetchRealms',
        function (data) {
            var header = "<table class='realmList'>";
            header += "<tr><th class='realmListName'>Name</th>";
            header += "<th class='realmListDescription'>Description</th>";
            header += "<th>Create Date</th>";
            header += "<th>Edit</th>";
            header += "<th>Delete</th></tr>";

            var row = 0;
            var body = "";
            data.forEach(function(item) {
                var rowClass = "realmListOddRow";
                if (0 == (++row % 2)) rowClass = "realmListEvenRow";
                body += "<tr id='" + item.id + "' class='" + rowClass + "'>";
                body += "<td>" + item.name + "</td>";
                body += "<td>" + item.description + "</td>";
                body += "<td>" + item.updatedAt + "</td>";
                body += "<td><input type='button' class='editRealDesign' value='Edit'/></td>";
                body += "<td><input type='button' class='deleteRealDesign' value='Delete'/></td>";
                body += "</tr>";
            });

            $('#realmList').html("");
            $('.editRealDesign').off();
            $('.deleteRealDesign').off();

            if (body.length > 0) {
                $('#realmList').html(header + body);

                $('.editRealDesign').on('click', function () {
                    editRealmDesign($(this));
                });

                $('.deleteRealDesign').on('click', function () {
                    deleteRealmDesign($(this));
                });
            }
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}


function editRealmDesign(target) {
    window.location = "/editRealm?id=" + target.closest('tr').attr('id');
}


function deleteRealmDesign(target) {
    var name = $(target.closest('tr').find('td')[0]).text();
    var id = target.closest('tr').attr('id');
    if (confirm("Are you sure you want to delete realm " + name)) {
        $.post(
            '/deleteRealm',
            {id: id},
            function (data) {
                loadRealmDesigns();
            }
        ).fail(function(res){
            alert("Error: " + JSON.parse(res.responseText).error);
        });
    }
}


function createRealmDesign() {
    var realmName = $('#realmName').val().trim();
    var realmDesc = $('#realmDescription').val().trim();
    var realmWidth = $('#realmWidth').val();
    var realmHeight = $('#realmHeight').val();

    $.post(
        '/createRealm',
        {
            name: realmName,
            description: realmDesc,
            width: realmWidth,
            height: realmHeight
        },
        function (data) {
            window.location = '/editRealm?id=' + data.id;
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
    });
}

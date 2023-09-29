
function parsons_create_choice(pid, choice_data){
    var well = $(studio_get_problem(pid));

    var index = 0;
    while($('#choice-' + index + '-' + pid).length != 0)
        index++;

    var row = $("#subproblem_parsons_choice").html();
    var new_row_content = row.replace(/PID/g, pid).replace(/CHOICE/g, index);
    var new_row = $("<div></div>").attr('id', 'choice-' + index + '-' + pid).html(new_row_content);
    console.log(new_row);
    $("#choices-" + pid, well).append(new_row);

    var editor = registerCodeEditor($(".parsons_conditions", new_row)[0], 'rst', 1);

    if("conditions" in choice_data)
        editor.setValue(choice_data["conditions"]);

    if("distractor" in choice_data && choice_data["distractor"] == true) {
        var checkbox = $(".parsons_distractor");
        checkbox.click();
    }
}

function parsons_delete_choice(pid, choice) {
    $('#choice-' + choice + '-' + pid).detach();
}

function init_task_drag_and_drop() {
    var choices = document.getElementById("task-choices");
    var	solution = document.getElementById("task-solution");
    console.log(choices);
    console.log(solution);

    new Sortable(choices, {
        group: 'sharable',
        animation: 150
    });
    new Sortable(solution, {
        group: 'sharable',
        animation: 150
    });

    var nestedSortables = [].slice.call(document.querySelectorAll('.nested-sortable'));
    // Loop through each nested sortable element
    for (var i = 0; i < nestedSortables.length; i++) {
        new Sortable(nestedSortables[i], {
            group: 'sharable',
            animation: 150,
            fallbackOnBody: true,
            swapThreshold: 0.95
        });
    }
}
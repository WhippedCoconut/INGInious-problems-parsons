function studio_init_template_parsons(well, pid, problem) {
    jQuery.each(problem["choices"], function(index, elem) {
        elem.index = index;
        parsons_create_choice(pid, elem);
    });
}

function load_input_parsons(submissionid, key, input) {
    console.log(key);
    console.log(input);
}

function load_feedback_parsons(key, content) {
    load_feedback_code(key, content);
}


function parsons_create_choice(pid, choice_data){
    var well = $(studio_get_problem(pid));

    var index = 0;
    while($('#choice-' + index + '-' + pid).length != 0)
        index++;

    var row = $("#subproblem_parsons_choice").html();
    var new_row_content = row.replace(/PID/g, pid).replace(/CHOICE/g, index);
    var new_row = $("<div></div>").attr('id', 'choice-' + index + '-' + pid).html(new_row_content);
    $("#choices-" + pid, well).append(new_row);

    if("content" in choice_data){
        $(".parsons_content_" + choice_data["index"]).val(choice_data["content"]);
    }

    var editor = registerCodeEditor($(".parsons_conditions_" + choice_data["index"], new_row)[0], 'rst', 1);
    if("conditions" in choice_data)
        editor.setValue(choice_data["conditions"]);

    if("distractor" in choice_data && choice_data["distractor"] === true) {
        var checkbox = $(".parsons_distractor_" + choice_data["index"]);
        checkbox.click();
    }

    if("nested" in choice_data && choice_data["nested"] === true) {
        var checkbox = $(".parsons_nested_" + choice_data["index"]);
        checkbox.click();
    }
}

function parsons_delete_choice(pid, choice) {
    $('#choice-' + choice + '-' + pid).detach();
}

function init_task_drag_and_drop() {
    var choices = document.getElementById("task-choices");
    var	solution = document.getElementById("task-solution");

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
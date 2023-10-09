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
        $("#choice-content-" + pid + '-' + choice_data["index"]).val(choice_data["content"]);
    }

    var editor = registerCodeEditor($("#choice-conditions-" + pid + '-' + choice_data["index"], new_row)[0], 'rst', 1);
    if("conditions" in choice_data)
        editor.setValue(choice_data["conditions"]);

    if("distractor" in choice_data && choice_data["distractor"] === true) {
        var button = $("#choice-distractor-" + pid + '-' + choice_data["index"]);
        button.click();
    }

    if("line" in choice_data){
        $("#choice-line-" + pid + '-' + choice_data["index"]).val(choice_data["line"])
    }

    if("indent" in choice_data){
        $("#choice-indent-" + pid + '-' + choice_data["index"]).val(choice_data["indent"])
    }
}

function parsons_delete_choice(pid, choice) {
    $('#choice-' + choice + '-' + pid).detach();
}

function parsons_toggle_choice(input_name) {
    var checkbox = $("input[name='" + input_name + "']");
    checkbox.click();
    var btn = checkbox.next("button");
    btn.toggleClass("btn-primary");
    btn.toggleClass("btn-success");
    var icon = btn.find("i");
    icon.toggleClass("fa-times");
    icon.toggleClass("fa-check");
}

function init_edit_drag_and_drop(pid) {
    var choices = document.getElementById("choices-" + pid);
    new Sortable(choices, {
        animation: 150
    });
}
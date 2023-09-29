
function studio_init_template_parsons(well, pid, problem){
    jQuery.each(problem["choices"], function(index, elem) {
        parsons_create_choice(pid, elem);
    });
}

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

function parsons_delete_choice(pid, choice)
{
    $('#choice-' + choice + '-' + pid).detach();
}
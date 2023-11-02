let dragAndDropDict = {};
function studio_init_template_parsons(well, pid, problem) {
    // Success message
    var editor = registerCodeEditor($("#msg-success-" + pid)[0], 'rst', 1);
    if("success_msg" in problem)
        editor.setValue(problem["success_msg"]);
    // Failed message
    editor = registerCodeEditor($("#msg-fail-" + pid)[0], 'rst', 1);
    if("fail_msg" in problem)
        editor.setValue(problem["fail_msg"]);
    // Level of indications
    $("#indication-" + pid).val(problem["indication"]).change();
    // Ranged or boolean grading
    if ("grading" in problem)
        $("#grading-" + pid).click();
    // 1D or 2D problem
    if ("indentation" in problem)
        $("#indentation-" + pid).click();

    // re-create existing choices
    jQuery.each(problem["choices"], function(index, elem) {
        elem.index = index;
        parsons_create_choice(pid, elem);
    });

    // load the correct order and indentation of items
    parsons_load_problem_input(pid, problem["inputs"]);
}

function load_input_parsons(submissionid, key, input) {
    parsons_load_problem_input(key, input[key]);
}

function load_feedback_parsons(key, content) {
    let parsing = parse_feedback_content(content[1]);
    load_feedback_code(key, [content[0], parsing.feedback]);
    for (let index = 0; index < parsing.table.length; index++) {
        let item = $("#choice-" + key + "-" + index);
        if (parsing.indication === '1' && item.parent().attr('id') === ("result-" + key)){
            if (parsing.table[index] !== "0")
                item.removeClass("border border-primary").addClass("border-danger");
            else
                item.removeClass("border border-primary").addClass("border-success");
        }
    }
}

/**
 * function used to parse the content[1] from the load_feedback function
 * in order to get the given indications data from the start of content[1]
 * param str: content[1] from load_feedback()
 * str is of the form <p>%indicationValue%</p>\n<p>%indexTable%</p>%feedbackContent%
 * where indicationValue is the level of indication,
 * indexTable are the wrong items indexes,
 * feedbackContent is the written feedback that have to be displayed
 * returns a dictionary {indicationValue, indexTable, feedbackContent}
 */
function parse_feedback_content(content){
    let result = {};
    result.indication = content[3];
    result.table = content.substring(13, content.indexOf("]")).split(", ");
    result.feedback = content.substring(content.indexOf("]")+6);
    return result;
}

function parsons_create_choice(pid, choice_data){
    var well = $(studio_get_problem(pid));

    var index = 0;
    if ("index" in choice_data)
        index = choice_data["index"];
    else {
        while($('#choice-' + pid + '-' + index).length !== 0)
        index++;
    }

    var row = $("#subproblem_parsons_choice").html();
    var new_row_content = row.replace(/PID/g, pid).replace(/CHOICE/g, index);
    var new_row = $("<div></div>")
        .attr('id', 'choice-' + pid + '-' + index)
        .attr('draggable', 'True')
        .html(new_row_content);
    $("#choices-" + pid, well).append(new_row);

    if("content" in choice_data){
        $("#choice-content-" + pid + '-' + choice_data["index"]).val(choice_data["content"]);
    }
    if ("success_msg" in choice_data)
        $("#choice-success-msg-" + pid + "-" + index).val(choice_data["success_msg"]);
    if ("fail_msg" in choice_data)
        $("#choice-fail-msg-" + pid + "-" + index).val(choice_data["fail_msg"]);

    if (Object.keys(choice_data).length === 0)
        dragAndDropDict[pid].addDraggable(index);
}

function parsons_delete_choice(pid, choice) {
    dragAndDropDict[pid].removeDraggable(choice)
    $('#choice-' + pid + '-' + choice).detach();
}

function parsons_toggle_indentation(pid) {
    // variable may not be ready
    if(typeof dragAndDropDict[pid] !== "undefined")
        dragAndDropDict[pid].toggleIndentation();
    else // retry in a moment
        setTimeout(() => parsons_toggle_indentation(pid), 250);
}

function parsons_load_problem_input(pid, inputs) {
    if (typeof dragAndDropDict[pid] !== "undefined")
        dragAndDropDict[pid].loadInput(inputs);
    else
        setTimeout(() => parsons_load_problem_input(pid, inputs), 250);
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
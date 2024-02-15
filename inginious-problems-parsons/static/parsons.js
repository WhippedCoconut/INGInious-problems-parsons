let dragAndDropDict = {};
function studio_init_template_parsons(well, pid, problem) {
    // Success message
    let editor = registerCodeEditor($("#msg-success-" + pid)[0], 'rst', 1);
    if("success_msg" in problem)
        editor.setValue(problem["success_msg"]);
    // Failed message
    editor = registerCodeEditor($("#msg-fail-" + pid)[0], 'rst', 1);
    if("fail_msg" in problem)
        editor.setValue(problem["fail_msg"]);
    // Level of indications
    if ("indication" in problem)
        $("#indication-" + pid).val(problem["indication"]).change();
    // Ranged or boolean grading
    if ("grading" in problem)
        $("#grading-" + pid).click();
    // 1D or 2D problem
    if ("indentation" in problem)
        $("#indentation-" + pid).click();

    // re-create existing choices
    jQuery.each(problem["choices"], function(_, elem) {
        parsons_create_choice(pid, elem);
    });

    // load the correct order and indentation of items
    parsons_load_problem_input(pid, problem["inputs"]);
}

function load_input_parsons(submissionid, key, input) {
    parsons_load_problem_input(key, input[key]);
}

function load_feedback_parsons(key, content) {
    let parsing = parsons_parse_feedback_content(content[1]);
    load_feedback_code(key, [content[0], parsing.feedback]);
    for (let index = 0; index < parsing.table.length; index++) {
        let item = $("#choice-" + key + "-" + index);
        // reset previous feedback if any
        item.removeClass("border-danger").removeClass("border-success").addClass("border border-primary");
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
function parsons_parse_feedback_content(content){
    let result = {};
    result.indication = content[3];
    result.table = content.substring(13, content.indexOf("]")).split(", ");
    result.feedback = content.substring(content.indexOf("]")+6);
    return result;
}

function parsons_create_choice(pid, choice_data){
    let index = 0;
    if ("id" in choice_data)
        index = choice_data["id"];
    else {
        while($('#choice-' + pid + '-' + index).length !== 0)
        index++;
    }

    let row = $("#subproblem_parsons_choice").html();
    let new_row_content = row.replace(/PID/g, pid).replace(/CHOICE/g, index);
    let new_row = $("<div></div>")
        .attr('id', 'choice-' + pid + '-' + index)
        .html(new_row_content);
    if ("distractor" in choice_data){
        $("#choice-create-distractor-" + pid + "-" + index, new_row).detach();
        $("#distractors-" + pid).append(new_row);
        let new_modal_input =
            "<div class=\"form-group row\">\n" +
            "    <label for=\"choice-pair-PID-CHOICE\" class=\"col-sm-2 control-label\">Paired distractor</label>\n" +
            "    <div class=\"col-10\">\n" +
            "        <input type=\"checkbox\" id=\"choice-pair-PID-CHOICE\" name=\"problem[PID][choices][CHOICE][pair]\" onclick='$(\"#choice-info-PID-CHOICE\").toggleClass(\"bg-primary\").toggleClass(\"bg-success\");'>\n" +
            "    </div>\n" +
            "</div>"
        new_modal_input = new_modal_input.replace(/PID/g, pid).replace(/CHOICE/g, index);
        $("#modal-body-" + pid + "-" + index).append(new_modal_input);
        $("#choice-distractor-" + pid + "-" + index).val(choice_data["distractor"]);
        $("#choice-info-" + pid + "-" + index).html("#" + ("00" + choice_data["distractor"]).slice(-2));
        if ("pair" in choice_data)
            $("#choice-pair-" + pid + "-" + index).click();
    }
    else {
        new_row.attr('draggable', 'True');
        $("#choices-" + pid).append(new_row);
        $("#choice-info-" + pid + "-" + index).html("#" + ("00" + index).slice(-2));
    }

    $("#choice-id-" + pid + "-" + index).val(index);
    if("content" in choice_data){
        const area = $("#choice-content-" + pid + '-' + index);
        area.val(choice_data["content"]);

        // set the height of the content in case of multi-line
        area.attr('rows', choice_data["content"].split('\n').length);
    }
    if ("success_msg" in choice_data)
        $("#choice-success-msg-" + pid + "-" + index).val(choice_data["success_msg"]);
    if ("fail_msg" in choice_data)
        $("#choice-fail-msg-" + pid + "-" + index).val(choice_data["fail_msg"]);

    // enable drag and drop for the new item if it is added manually and not a distractor
    // when added manually, it has no given id
    if ("newChoice" in choice_data)
        dragAndDropDict[pid].addDraggable(index);
    if ("newDistractor" in choice_data)
        dragAndDropDict[pid].addDistractor(index);
}

function parsons_delete_choice(pid, choice) {
    dragAndDropDict[pid].removeDraggable(choice)
}

function parsons_create_distractor(pid, id){
    const choice_data = {
        "newDistractor": true,
        "distractor": id,
        "content": $("#choice-content-" + pid + "-" + id).val()
    }
    parsons_create_choice(pid, choice_data);
}

function parsons_toggle_indentation(pid) {
    // variable may not be ready
    if(typeof dragAndDropDict[pid] !== "undefined")
        dragAndDropDict[pid].toggleIndentation();
    else // retry in a moment
        setTimeout(() => parsons_toggle_indentation(pid), 250);
}

function parsons_load_problem_input(pid, inputs) {
    if (typeof inputs === "undefined")
        return;
    if (typeof dragAndDropDict[pid] !== "undefined")
        dragAndDropDict[pid].loadInput(inputs);
    else
        setTimeout(() => parsons_load_problem_input(pid, inputs), 250);
}

function parsons_generate_from_file(pid) {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
        let file = input.files[0];
        let fileExtension = file.name.split('.').pop();
        file.text().then((str) => {
            if (fileExtension === "json") {
                let data = JSON.parse(str);
                if ("name" in data)
                    $("#name-" + pid).val(data.name);
                if ("context" in data)
                    codeEditors["problem[" + pid + "][header]"].setValue(data.context);
                if ("success_msg" in data)
                    codeEditors["problem[" + pid + "][success_msg]"].setValue(data.success_msg);
                if ("fail_msg" in data)
                    codeEditors["problem[" + pid + "][fail_msg]"].setValue(data.fail_msg);
                if ("indication" in data)
                    $("#indication-" + pid).val(data.indication);
                if ("grading" in data)
                    $("#grading-" + pid).click();
                if ("indentation" in data)
                    $("#indentation-" + pid).click();
                if ("choices" in data){
                    let eachChoiceHasID = true;
                    let idSet = new Set()
                    data.choices.forEach((choice) => {
                        if ("id" in choice){
                            if (idSet.has(choice.id)){
                                alert("The file could not be loaded due to multiple items sharing the same IDs.");
                                location.reload();
                                return;
                            }
                            idSet.add(choice.id);
                        }
                        else
                            eachChoiceHasID = false;
                        if ("distractor" in choice)
                            choice.newDistractor = true;
                        else
                            choice.newChoice = true;
                        parsons_create_choice(pid, choice);
                    });
                    if ("input" in data && eachChoiceHasID)
                        dragAndDropDict[pid].loadInput(JSON.stringify(data.input));
                    else if  ("input" in data)
                        alert("The input couldn't be loaded due to the absence of an ID for one or more items.");
                }
            }
            else {
                let itemsContent = str.split('\n');
                itemsContent.forEach((content) => {
                    if ($("#indentation-" + pid).is(":checked"))
                        // removes spaces at the beginning in case the file contains an indented code
                        content = content.trimStart();
                    if (content !== "")
                        parsons_create_choice(pid, {"newChoice": true, "content": content});
                });
            }
            dragAndDropDict[pid].updateResult();
        });
    };
    input.click();
}

function parsons_export_file(pid) {
    let data = {};

    let name = $("#name-" + pid);
    if (name.val() !== "")
        data.name = name.val();
    let context = $("#header-" + pid);
    if (context.val() !== "")
        data.context = context.val();
    let success_msg = $("#msg-success-" + pid);
    if (success_msg.val() !== "")
        data.success_msg = success_msg.val();
    let fail_msg = $("#msg-fail-" + pid);
    if (fail_msg.val() !== "")
        data.fail_msg = fail_msg.val();
    data.indication = $("#indication-" + pid).val();
    if ($("#indentation-ParsonsTesting").is(":checked"))
        data.indentation = true;
    if ($("#grading-ParsonsTesting").is(":checked"))
        data.grading = true;

    data.choices = [];
    dragAndDropDict[pid].items.forEach((item) => {
        let id = item.id.split('-')[2];
        let choice = {id : id};

        let content = $("#choice-content-" + pid + "-" + id);
        if (content.val() !== "")
            choice.content = content.val();
        let success_msg = $("#choice-success-msg-" + pid + "-" + id);
        if (success_msg.val() !== "")
            choice.success_msg = success_msg.val();
        let fail_msg = $("#choice-fail-msg-" + pid + "-" + id);
        if (fail_msg.val() !== "")
            choice.fail_msg = fail_msg.val();
        let distractor = $("#choice-distractor-" + pid + "-" + id);
        if (distractor.val() !== ""){
            choice.distractor = distractor.val();
            if ($("#choice-pair-" + pid + "-" + id).is(":checked"))
                choice.pair = true;
        }
        data.choices.push(choice);
    });
    data.input = JSON.parse($("#inputs-" + pid).val());

    // convert data into a human-readable json
    let json = JSON.stringify(data, null, 4);
    const file = new File(["\ufeff" + json], pid + ".json", {type: "text/plain:charset=UTF-8"});

    // function from /lib/FileSaver/FileSave.min.js
    saveAs(file, pid + ".json");
}

function parsons_toggle_pairing(pid, choice) {
    $("#choice-info-" + pid + "-" + choice).toggleClass("bg-primary").toggleClass("bg-success");
}
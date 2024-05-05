let dragAndDropDict = {};
let parsonsStates = {};
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
    // Length feedback
    if ("length_feedback" in problem)
        $("#length-feedback-" + pid).click();
    // Adaptive settings
    if ("adaptive" in problem){
        $("#adaptive-" + pid).click();
        $("#adaptive-start-" + pid).val(problem["adaptive-params"][0]);
        $("#adaptive-interval-" + pid).val(problem["adaptive-params"][1]);
        $("#adaptive-stop-" + pid).val(problem["adaptive-params"][2]);
    }
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
        // reset feedback if any
    $("[id^=choice-" + key +  "]").removeClass("border-danger")
        .removeClass("border-success")
        .removeClass("border-warning")
        .removeClass("hint-disabled")
        .addClass("border border-primary");
    let fusedBlocks = $("[id^=choice-fused-" + key + "]");
    $("#distractors-" + key).append(fusedBlocks.children());
    fusedBlocks.detach();
    dragAndDropDict[key].loadInput($(".parsons-result-input-" + key).val());
    let parsing = parsons_parse_feedback_content(content[1]);
    load_feedback_code(key, [content[0], parsing.feedback]);
    let itemsInResult = $("#result-" + key).children();
    jQuery.each(itemsInResult, (index, item) => {
        // reset indent feedback if any
        $(item).find(".indent-feedback").removeClass("indent-feedback").addClass("invisible");
        if (parsing.indication === 1){
            if (parsing.table[index] > 2)
                $(item).removeClass("border border-primary").addClass("border-danger");
            else
                $(item).removeClass("border border-primary").addClass("border-success");
        }
        else if (parsing.indication === 2){
            if (parsing.table[index] === 2 || parsing.table[index] === 3)
                $(item).removeClass("border border-primary").addClass("border-warning");
            else if (parsing.table[index] === 4 || parsing.table[index] === 5)
                $(item).removeClass("border border-primary").addClass("border-danger");
            else
                $(item).removeClass("border border-primary").addClass("border-success");
            if ((parsing.table[index] % 2) > 0)
                $(item).find(".invisible").removeClass("invisible").addClass("indent-feedback")
        }
    });

    // Adaptive modifications
    // TODO: move to hint button when added
    parsing.hints[1].forEach((id) => { // Disable the distractors
        let distractor = $("#choice-" + key + "-" + id);
        // reset previous feedback if any
        distractor.removeClass("border-danger")
            .removeClass("border-success")
            .removeClass("border-warning")
            .removeClass("border")
            .addClass("border-success");

        if (distractor.is("[class^=paired-]")) { // moving paired blocks
            let list = $("[id^=paired-]").filter( (_, elem) => {
                return distractor.hasClass(elem.id);
            });
            list.children().not("h6").not(".hint-disabled").attr("draggable", true).removeClass("bg-gray").addClass("bg-white");
            list.append(distractor);
        }
        else // moving normal blocks
            $("#distractors-" + key).append(distractor);

        distractor.css("margin-left", "0px");
        distractor.addClass("hint-disabled");
        distractor.attr("draggable", false).removeClass("bg-white").addClass("bg-gray");
    });
    if (parsonsStates[key] && parsonsStates[key][1].length < parsing.hints[1].length)
        alert("One of the misleading options has been deactivated, resulting in a total of " + parsing.hints[1].length +  " disabled choices");

    parsing.hints[2].forEach((fusion, index) => {
        let firstChoice = $("#choice-" + key + "-" + fusion[0]);
        firstChoice.before('<div id="choice-fused-' + key + '-' + index + '" style="border:2px solid" class="mt-1 mb-1 bg-white border-primary" draggable="true"</div>');
        let firstChoiceIndex = dragAndDropDict[key].getIndex(firstChoice[0]);
        let fusionIndent = dragAndDropDict[key].itemsIndent[firstChoiceIndex] - parsing.hints[3][firstChoiceIndex];
        fusion.forEach((id) => {
            let choice = $("#choice-" + key + "-" + id);
            $("#choice-fused-" + key + "-" + index).append(choice);
            choice.attr("draggable", false);
            choice.removeClass("border").removeClass("mt-1 mb-1").addClass("border-0");
            choice.css("margin-left", parsing.hints[3][id] * 50 + "px");
        });
        $("#choice-fused-" + key + "-" + index).css("margin-left", fusionIndent * 50 + "px");
        dragAndDropDict[key].addDraggable(index, true);
    });

    parsonsStates[key] = parsing.hints;
    setTimeout(() => {
        dragAndDropDict[key].updateValues();
        dragAndDropDict[key].updateResult();
    }, 250);
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
    // "<p>2</p>\n<p>[5, 4, 4]</p>\n<p>Failed.</p>\n<p>Grade: 0.00%</p>\n<p>[1, [], []]</p>\n"
    let result = {};
    let contentSplit = content.split('\n');
    result.indication = parseInt(contentSplit[0][3]);
    result.table = contentSplit[1].substring(4, contentSplit[1].length-5).split(',').map((elem) => {return parseInt(elem)});
    result.hints = JSON.parse(contentSplit[contentSplit.length-2].substring(3, contentSplit[contentSplit.length-2].length-4));
    contentSplit.splice(0, 2); // delete the two first elements
    contentSplit.splice(contentSplit.length-2, 2); // delete the two last elements
    result.feedback = contentSplit.join('\n');
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
        $("#result-" + pid).append(new_row);
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
        dragAndDropDict[pid].addDraggable(index, false);
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
                if ("length_feedback" in data)
                    $("#length-feedback-" + pid).click();
                if ("adaptive" in data){
                    $("#adaptive-" + pid).click();
                    $("#adaptive-start-" + pid).val(data.adaptive_start);
                    $("#adaptive-interval-" + pid).val(data.adaptive_interval);
                    $("#adaptive-stop-" + pid).val(data.adaptive_stop);
                }
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

    if ($("#adaptive-" + pid).is(":checked")){
        data.adaptive = true;
        data.adaptive_start = $("#adaptive-start-" + pid).val();
        data.adaptive_interval = $("#adaptive-interval-" + pid).val();
        data.adaptive_stop = $("#adaptive-stop-" + pid).val();
    }
    if ($("#indentation-" + pid).is(":checked"))
        data.indentation = true;
    if ($("#grading-" + pid).is(":checked"))
        data.grading = true;
    if ($("#length-feedback-" + pid).is(":checked"))
        data.length_feedback = true;

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
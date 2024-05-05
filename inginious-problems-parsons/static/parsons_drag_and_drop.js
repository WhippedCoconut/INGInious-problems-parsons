function ParsonsDragAndDrop(itemID, options) {
    this.itemID = itemID;

    this.resultList = document.querySelector(".parsons-result-" + itemID);
    this.distractorList = document.querySelector(".parsons-distractors-" + itemID);
    this.pairedList = [...document.querySelectorAll("[id^=paired-" + itemID + "]")];
    // get all items sorted by id, sorted is important when reloading the page with distractors on the edit page
    this.items = $("[id^=choice-" + itemID + "]").toArray().sort(function (a, b) {
        return a.id.localeCompare(b.id, undefined, {numeric: true});
    });
    this.itemsValues = new Array(this.items.length);
    this.itemsIndent = new Array(this.items.length).fill(0);
    this.enableIndentation = options.indent;
    this.editPage = options.edit;

    this.items.forEach((item) => {
        item.addEventListener("dragstart", (elem) => {
            item.classList.add("dragging-" + itemID);
            this.startItemLeftX = elem.clientX - item.getBoundingClientRect().left;
            this.draggingItemIndex = this.getIndex(item);
            // used to disable other paired items when inside the same pairing
            this.dragStartPairs = null;
            if ($(item).is("[class^=paired-" + itemID + "]") && $(item).parent().parent().is(this.distractorList))
                this.dragStartPairs = [...document.querySelectorAll("." + item.parentElement.id + ":not(.dragging-" + itemID + ")")];

            if (!options.edit) {
                // reset all items border class to avoid keeping border color of previous feedback
                this.items.forEach((item) => {
                    $(item).removeClass("border-danger")
                        .removeClass("border-success")
                        .removeClass("border-warning")
                        .addClass("border border-primary");
                    $(item).find(".indent-feedback").removeClass("indent-feedback").addClass("invisible");
                });
            }
        });

        item.addEventListener("dragend", () => {
            if (this.dragStartPairs !== null && $(item).parent().is(this.resultList))
                $(this.dragStartPairs).attr("draggable", false).removeClass("bg-white").addClass("bg-gray");
            else if ($(item).hasClass(item.parentElement.id))
                $(item).parent().children().not("h6").not(".hint-disabled").attr("draggable", true).removeClass("bg-gray").addClass("bg-white");
            item.classList.remove("dragging-" + itemID);
            this.updateValues();
            this.updateResult();
        });

        this.updateValues()
        this.updateResult()
    });

    if (!options.edit) {
        this.distractorList.addEventListener("dragover", (elem) => {
            elem.preventDefault();
            let draggingItem = document.querySelector(".dragging-" + itemID);
            let otherItems = [...$("#distractors-" + itemID).children().not(".dragging-" + itemID)];
            let nextItem = otherItems.find(item => {
                let rect = item.getBoundingClientRect();
                return elem.clientY <= rect.top + item.offsetHeight / 2;
            });
            if (draggingItem !== null && nextItem && !($(draggingItem).is("[class^=paired-]")))
                this.distractorList.insertBefore(draggingItem, nextItem);
            else if (draggingItem !== null && !($(draggingItem).is("[class^=paired-]")))
                this.distractorList.appendChild(draggingItem);
        });
    }

    this.resultList.addEventListener("dragover", (elem) => {
        elem.preventDefault();
        let draggingItem = document.querySelector(".dragging-" + itemID);
        let otherItems = [...$("#result-" + itemID).children().not(".dragging-" + itemID)];
        let nextItem = otherItems.find(item => {
            let rect = item.getBoundingClientRect();
            return elem.clientY <= rect.top + item.offsetHeight / 2;
        });
        if (draggingItem !== null && nextItem)
            this.resultList.insertBefore(draggingItem, nextItem);
        else if (draggingItem !== null)
            this.resultList.appendChild(draggingItem);

        if (this.enableIndentation){
            let leftOrigin = this.resultList.getBoundingClientRect().left + 20;
            let itemLeft = elem.clientX - this.startItemLeftX;
            this.updateIndent(itemLeft - leftOrigin, itemID);
        }
    });

    this.pairedList.forEach((list) => {
        list.addEventListener("dragover", (elem) => {
            elem.preventDefault();
            let draggingItem = document.querySelector(".dragging-" + itemID);
            let nextItem = null
            if (this.dragStartPairs) {
                nextItem = this.dragStartPairs.find(item => {
                    let rect = item.getBoundingClientRect();
                    return elem.clientY <= rect.top + item.offsetHeight / 2;
                });
            }
            if (draggingItem !== null && nextItem && $(draggingItem).hasClass(list.id))
                list.insertBefore(draggingItem, nextItem);
            else if (draggingItem !== null && $(draggingItem).hasClass(list.id))
                list.appendChild(draggingItem);
        });
    });
}

ParsonsDragAndDrop.prototype.addDraggable = function (index, fusedBlock) {
    let item;
    if (fusedBlock){
        item = document.querySelector("#choice-fused-" + this.itemID + '-' + index);
    }
    else {
        item = document.querySelector("#choice-" + this.itemID + '-' + index);
        this.items.splice(index, 0, item); // insert item at index
        this.itemsValues.splice(index, 0, -1); // insert value -1 at the item index
        this.itemsIndent.splice(index, 0, 0);  // insert indent 0 at the item index
        this.updateValues();
        this.updateResult();
    }

    item.addEventListener("dragstart", (elem) => {
        item.classList.add("dragging-" + this.itemID);
        this.draggingItemIndex = this.getIndex(item);
        this.startItemLeftX = elem.clientX - item.getBoundingClientRect().left;
    });

    item.addEventListener("dragend", () => {
        item.classList.remove("dragging-" + this.itemID);
        this.updateValues();
        this.updateResult();
    });
};

ParsonsDragAndDrop.prototype.removeDraggable = function (id) {
    let item = document.querySelector("#choice-" + this.itemID + "-" + id);
    let index = this.items.indexOf(item);
    this.items.splice(index, 1); //remove item at index
    this.itemsValues.splice(index, 1);
    this.itemsIndent.splice(index, 1);
    $('#choice-' + this.itemID + '-' + id).detach();
    this.updateValues();
    this.updateResult();
};

ParsonsDragAndDrop.prototype.addDistractor = function (index) {
    let distractor = document.querySelector("#choice-" + this.itemID + '-' + index);
    this.items.splice(index, 0, distractor); // insert item at index
    this.itemsValues.splice(index, 0, -1); // insert value -1 at the item index
    this.itemsIndent.splice(index, 0, 0);  // insert indent 0 at the item index
    this.updateValues();
    this.updateResult();
};

ParsonsDragAndDrop.prototype.updateIndent = function (offset) {
    if (this.draggingItemIndex === -1){
        let indent = Math.min(Math.max(0, Math.round(offset / 50)), 10);
        let item = $(".dragging-" + this.itemID);
        let state = JSON.parse($(".parsons-result-input-" + this.itemID).val())["state"];
        item.children().each((_, item) => {
            this.itemsIndent[this.getIndex(item)] = indent + state[3][this.getIndex(item)];
        });
        item.css("margin-left", indent * 50 + "px");
    }
    else {
        this.itemsIndent[this.draggingItemIndex] = Math.min(Math.max(0, Math.round(offset / 50)), 10);
        let item = $("#" + this.items[this.draggingItemIndex].id);
        item.css("margin-left", this.itemsIndent[this.draggingItemIndex] * 50 + "px");
    }
};

ParsonsDragAndDrop.prototype.updateValues = function () {
    const itemsInResult = [...this.resultList.querySelectorAll("[id^=choice-" + this.itemID + "]")];
    this.itemsValues = new Array(this.itemsValues.length).fill(-1);
    for (let i = 0; i < itemsInResult.length; i++) {
        let index = this.getIndex(itemsInResult[i]);
        this.itemsValues[index] = i;
    }
};

ParsonsDragAndDrop.prototype.updateResult = function () {
    let result = {
        lines: this.itemsValues,
        indent: this.itemsIndent,
        state: parsonsStates[this.itemID]
    };
    $(".parsons-result-input-" + this.itemID).val(JSON.stringify(result));
};

ParsonsDragAndDrop.prototype.toggleIndentation = function () {
    this.enableIndentation = !this.enableIndentation;
    // reset indentation of every item to 0
    if (this.enableIndentation === false) {
        $("[id^=choice-" + this.itemID + "]").css("margin-left", "0px");
        this.itemsIndent.fill(0);
        this.updateResult();
    }
}

ParsonsDragAndDrop.prototype.getIndex = function (item) {
    return this.items.indexOf(item);
};

ParsonsDragAndDrop.prototype.loadInput = function (input) {
    let parsed_input = JSON.parse(input);
    this.itemsValues = parsed_input.lines;
    this.itemsIndent = parsed_input.indent;

    let sortedItems = new Array(this.items.length).fill(null);
    for (let i = 0; i < this.items.length; i++) {
        if (this.itemsValues[i] === -1) { // remove indentation of distractors
            this.itemsIndent[i] = 0;
            $("#choice-" + this.itemID + "-" + i).css("margin-left", "0px");
            sortedItems.splice(this.itemsValues[i], 1);
        } else {
            sortedItems.splice(this.itemsValues[i], 1, this.items[i]);
        }

        if (!this.editPage) {
            // reset the dragability in case it was disabled by adaptive hints
            $(this.items[i]).attr("draggable", true).addClass("bg-white").removeClass("bg-gray");
            //reset border feedback if any
            $(this.items[i]).removeClass("border-danger")
                .removeClass("border-success")
                .removeClass("border-warning")
                .removeClass("hint-disabled")
                .addClass("border border-primary");
            $(this.items[i]).find(".indent-feedback").removeClass("indent-feedback").addClass("invisible");
        }
        // moves every item in the distractor list to reorder items in the result list
        if ($(this.items[i]).is("[class^=paired-]")) { // moving paired blocks
            let list = this.pairedList.find(list => {
                return $(this.items[i]).hasClass(list.id)
            });
            list.appendChild(this.items[i]);
        }
        else // not a paired block
            this.distractorList.appendChild(this.items[i]);
    }
    this.updateResult();

    //rearrange item from the result list and add the correct amount of indentation
    sortedItems.forEach((item) => {
        let parent = item.parentElement; // the parent is needed for paired blocks
        this.resultList.appendChild(item);
        if ($(item).is("[class^=paired-" + this.itemID + "]")){ // disable other paired blocks
            let pairs = [...parent.querySelectorAll("." + parent.id)];
            $(pairs).attr("draggable", false).removeClass("bg-white").addClass("bg-gray");
        }
        let index = this.getIndex(item);
        $("#" + item.id).css("margin-left", this.itemsIndent[index] * 50 + "px");
    });
};

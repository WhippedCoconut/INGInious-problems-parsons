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

    this.items.forEach((item) => {
        item.addEventListener("dragstart", (elem) => {
            item.classList.add(itemID + "dragging");
            this.dragStartX = elem.clientX;
            this.draggingItemIndex = this.getIndex(item);
            this.dragStartIndent = this.itemsIndent[this.draggingItemIndex];
            // used to disable other paired items when inside the same pairing
            this.dragStartPairs = null;
            if ($(item).is("[class^=paired-" + itemID + "]") && $(item).parent().parent().is(this.distractorList))
                this.dragStartPairs = [...document.querySelectorAll("." + item.parentElement.id + ":not(." + itemID + "dragging")];

            if (!options.edit) {
                // reset all items border class to avoid keeping border color of previous feedback
                this.items.forEach((i) => {
                    i.classList.remove("border-danger");
                    i.classList.remove("border-success");
                    i.classList.add("border");
                    i.classList.add("border-primary");
                });
            }
        });

        item.addEventListener("dragend", () => {
            if (this.dragStartPairs !== null && $(item).parent().is(this.resultList))
                $(this.dragStartPairs).attr("draggable", false).removeClass("bg-white").addClass("bg-gray");
            else if ($(item).hasClass(item.parentElement.id))
                $(item).parent().children().not("h6").attr("draggable", true).removeClass("bg-gray").addClass("bg-white");
            item.classList.remove(itemID + "dragging");
            this.updateValues();
            this.updateResult();
        });

        let scrollTop = false;
        let scrollBot = false;
        item.addEventListener("drag", (elem) => {
            scrollTop = elem.clientY < 150;
            scrollBot = elem.clientY > (document.documentElement.clientHeight - 150);

            if (scrollBot)
                setTimeout(() => {
                    let scrollY = $(window).scrollTop();
                    $(window).scrollTop(scrollY + 3);
                }, 20)

            if (scrollTop)
                setTimeout(() => {
                    let scrollY = $(window).scrollTop();
                    $(window).scrollTop(scrollY - 3);
                }, 20);
        });

        this.updateValues()
        this.updateResult()
    });

    if (!options.edit) {
        this.distractorList.addEventListener("dragover", (elem) => {
            elem.preventDefault();
            let draggingItem = document.querySelector('.' + itemID + "dragging");
            let otherItems = [...this.distractorList.querySelectorAll("[id^=choice-" + itemID + "]:not(." + itemID + "dragging):not([class^=paired-" + itemID + "])")];
            let nextItem = otherItems.find(item => {
                let rect = item.getBoundingClientRect();
                return elem.clientY <= rect.top + item.offsetHeight / 2;
            });
            if (draggingItem !== null && nextItem && !($(draggingItem).is("[class^=paired-]")))
                this.distractorList.insertBefore(draggingItem, nextItem);
            else if (draggingItem !== null && !($(draggingItem).is("[class^=paired-]")))
                this.distractorList.appendChild(draggingItem);

            if (this.enableIndentation && draggingItem !== null)
                this.updateIndent(elem.clientX - this.dragStartX, itemID);
        });
    }

    this.resultList.addEventListener("dragover", (elem) => {
        elem.preventDefault();
        let draggingItem = document.querySelector('.' + itemID + "dragging");
        let otherItems = [...this.resultList.querySelectorAll("[id^=choice-" + itemID + "]:not(." + itemID + "dragging)")];
        let nextItem = otherItems.find(item => {
            let rect = item.getBoundingClientRect();
            return elem.clientY <= rect.top + item.offsetHeight / 2;
        });
        if (draggingItem !== null && nextItem)
            this.resultList.insertBefore(draggingItem, nextItem);
        else if (draggingItem !== null)
            this.resultList.appendChild(draggingItem);

        if (this.enableIndentation)
            this.updateIndent(elem.clientX - this.dragStartX, itemID);
    });

    this.pairedList.forEach((list) => {
        list.addEventListener("dragover", (elem) => {
            elem.preventDefault();
            let draggingItem = document.querySelector('.' + itemID + "dragging");
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

            if (this.enableIndentation)
                this.updateIndent(elem.clientX - this.dragStartX, itemID);
        });
    });
}

ParsonsDragAndDrop.prototype.addDraggable = function (index) {
    let item = document.querySelector("#choice-" + this.itemID + '-' + index);

    this.items.splice(index, 0, item); // insert item at index
    this.itemsValues.splice(index, 0, -1); // insert value -1 at the item index
    this.itemsIndent.splice(index, 0, 0);  // insert indent 0 at the item index
    this.updateValues();
    this.updateResult();

    item.addEventListener("dragstart", (elem) => {
        item.classList.add(this.itemID + "dragging");
        this.dragStartX = elem.clientX;
        this.draggingItemIndex = this.getIndex(item);
        this.dragStartIndent = this.itemsIndent[this.draggingItemIndex];
    });

    item.addEventListener("dragend", () => {
        item.classList.remove(this.itemID + "dragging");
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
    this.itemsIndent[this.draggingItemIndex] = Math.min(Math.max(0, this.dragStartIndent + Math.round(offset / 50)), 10);
    let item = $("#" + this.items[this.draggingItemIndex].id);
    item.css("margin-left", this.itemsIndent[this.draggingItemIndex] * 60 + "px");
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
        indent: this.itemsIndent
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
        $("#" + item.id).css("margin-left", this.itemsIndent[index] * 60 + "px");
    });
};

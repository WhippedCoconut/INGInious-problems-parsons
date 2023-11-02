function ParsonsDragAndDrop(itemID, options) {
    this.itemID = itemID;

    this.resultList = document.querySelector(".parsons-result-" + itemID);
    this.distractorList = document.querySelector(".parsons-distractors-" + itemID);
    this.lists = [this.resultList, this.distractorList];

    this.items = $("[id^=choice-" + itemID + "]").toArray();
    this.itemsValues = new Array(this.items.length);
    this.itemsIndent = new Array(this.items.length).fill(0);

    this.enableIndentation = options.indent;

    this.items.forEach((item) => {
        item.addEventListener("dragstart", (elem) => {
            item.classList.add(itemID + "dragging");
            this.dragStartX = elem.clientX;
            this.draggingItemIndex = this.getIndex(item);
            this.dragStartIndent = this.itemsIndent[this.draggingItemIndex];

            // reset item border class to avoid keeping border color of previous feedback
            item.classList.remove("border-danger");
            item.classList.remove("border-success");
            item.classList.add("border");
            item.classList.add("border-primary");
        });

        item.addEventListener("dragend", () => {
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
                    var scrollY = $(window).scrollTop();
                    $(window).scrollTop(scrollY + 3);
                }, 20)

            if (scrollTop)
                setTimeout(() => {
                    var scrollY = $(window).scrollTop();
                    $(window).scrollTop(scrollY - 3);
                }, 20);
        });

        this.updateValues()
        this.updateResult()
    });

    this.lists.forEach((list) => {
        list.addEventListener("dragover", (elem) => {
            elem.preventDefault();
            let draggingItem = document.querySelector('.' + itemID + "dragging");
            let otherItems = [...list.querySelectorAll("[id^=choice-" + itemID + "]:not(." + itemID + "dragging)")];
            let nextItem = otherItems.find(item => {
                let rect = item.getBoundingClientRect();
                return elem.clientY <= rect.top + item.offsetHeight / 2;
            });
            if (draggingItem !== null && nextItem)
                list.insertBefore(draggingItem, nextItem);
            else if (draggingItem !== null)
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

ParsonsDragAndDrop.prototype.removeDraggable = function (index) {
    this.items.splice(index, 1); //remove item at index
    this.itemsValues.splice(index, 1);
    this.itemsIndent.splice(index, 1);
};

ParsonsDragAndDrop.prototype.updateIndent = function (offset) {
    this.itemsIndent[this.draggingItemIndex] = Math.max(0, this.dragStartIndent + Math.round(offset / 50));
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

    console.log({
        "lines": this.itemsValues,
        "indent": this.itemsIndent
    });
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
            sortedItems.splice(this.itemsValues[i], 1);
        } else {
            sortedItems.splice(this.itemsValues[i], 1, this.items[i]);
        }
        // moves every item in the distractor list in order to reorder item in the result list
        this.distractorList.appendChild(this.items[i]);
    }
    this.updateResult();

    //rearrange item from the result list and add the correct amount of indentation
    sortedItems.forEach((item) => {
        this.resultList.appendChild(item);
        let index = this.getIndex(item);
        $("#choice-" + this.itemID + "-" + index).css("margin-left", this.itemsIndent[this.getIndex(item)] * 60 + "px");
    });
};

// From https://stackoverflow.com/questions/18809678/make-html5-draggable-items-scroll-the-page
var scroll = function (step) {
    var scrollY = $(window).scrollTop();
    $(window).scrollTop(scrollY + step);
    if (!stop) {
        setTimeout(function () {
            scroll(step)
        }, 20);
    }
};

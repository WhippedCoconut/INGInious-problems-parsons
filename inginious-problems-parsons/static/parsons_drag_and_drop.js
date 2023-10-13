
function ParsonsDragAndDrop(itemID) {
    this.itemID = itemID;

    this.lists = document.querySelectorAll(".parsons-list-" + itemID);
    this.resultList  = document.querySelector(".parsons-result-" + itemID);

    this.items = $("[id^=choice-" + itemID + "]").toArray();
    this.itemsValues = new Array(this.items.length);
    this.itemsIndent = new Array(this.items.length).fill(0);


    this.items.forEach((item) => {
        item.addEventListener("dragstart", (elem) => {
           item.classList.add(itemID + "dragging");
           this.dragStartX = elem.clientX;
           this.draggingItemIndex = this.getIndex(item);
           this.dragStartIndent = this.itemsIndent[this.draggingItemIndex];
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
                }, 20)
        });
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
           this.updateIndent(elem.clientX - this.dragStartX, itemID);
       });
    });
};

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
}

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

    console.log("value:  " + this.itemsValues);
    console.log("indent: " + this.itemsIndent);
};

ParsonsDragAndDrop.prototype.getIndex = function (item) {
    return this.items.indexOf(item);
};

// From https://stackoverflow.com/questions/18809678/make-html5-draggable-items-scroll-the-page
var scroll = function (step) {
    var scrollY = $(window).scrollTop();
    $(window).scrollTop(scrollY + step);
    if (!stop) {
        setTimeout(function () { scroll(step) }, 20);
    }
}

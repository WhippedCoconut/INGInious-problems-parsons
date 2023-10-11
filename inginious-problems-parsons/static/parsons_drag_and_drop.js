
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
           if (nextItem)
               list.insertBefore(draggingItem, nextItem);
           else
               list.appendChild(draggingItem);
           this.updateIndent(elem.clientX - this.dragStartX, itemID);
       });
    });
}

ParsonsDragAndDrop.prototype.updateIndent = function (offset) {
    this.itemsIndent[this.draggingItemIndex] = Math.max(0, this.dragStartIndent + Math.round(offset / 50));
    $('#choice-' + this.itemID + '-' + this.draggingItemIndex).css("margin-left", this.itemsIndent[this.draggingItemIndex] * 60 + "px");
    $("#parsons-result-indent").val(this.itemsIndent);
}

ParsonsDragAndDrop.prototype.updateValues = function () {
    const itemsInResult = this.resultList.querySelectorAll(".parsons-item");
    this.itemsValues = new Array(this.itemsValues.length).fill(-1);
    for (let i = 0; i < itemsInResult.length; i++) {
        let index = this.getIndex(itemsInResult[i]);
        this.itemsValues[index] = i;
    }
}

ParsonsDragAndDrop.prototype.updateResult = function () {
    let result = {
        lines: this.itemsValues,
        indent: this.itemsIndent
    };
    $(".parsons-result-input-" + this.itemID).val(JSON.stringify(result));
}

ParsonsDragAndDrop.prototype.getIndex = function (item) {
    let split = item.id.split('-');
    return parseInt(split[split.length -1]);
}
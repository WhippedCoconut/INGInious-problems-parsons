let items;
let lists;
let resultList;

let dragStartX;
let dragStartY;
let dragStartIndent;
let draggingItemIndex;

let itemsValues;
let itemsIndent;

function parsons_init(element, itemID) {
    items = element.querySelectorAll(".parsons-item");
    lists = element.querySelectorAll(".parsons-list");
    resultList  = document.querySelector(".parsons-result");
    itemsValues = new Array(items.length);
    itemsIndent = new Array(items.length).fill(0);

    items.forEach((item) => {
        item.addEventListener("dragstart", (elem) => {
           item.classList.add("dragging");
           dragStartX = elem.clientX;
           dragStartY = elem.clientY;
           draggingItemIndex = parseInt(item.id.split('-')[1]);
           dragStartIndent = itemsIndent[draggingItemIndex];
        });

        item.addEventListener("dragend", (elem) => {
           item.classList.remove("dragging");
           updateValues();
           updateResult();
        });
    });

    lists.forEach((list) => {
       list.addEventListener("dragover", (elem) => {
           elem.preventDefault();
           let draggingItem = document.querySelector(".dragging");
           let otherItems = [...list.querySelectorAll(".parsons-item:not(.dragging)")];
           let nextItem = otherItems.find(item => {
               let rect = item.getBoundingClientRect();
               return elem.clientY <= rect.top + item.offsetHeight / 2;
           });
           if (nextItem)
               list.insertBefore(draggingItem, nextItem);
           else
               list.appendChild(draggingItem);

           updateIndent(elem.clientX - dragStartX, itemID);
       });
    });
}


function updateIndent(offset, itemID) {
    itemsIndent[draggingItemIndex] = Math.max(0, dragStartIndent + Math.round(offset / 50));
    $('#' + itemID + draggingItemIndex).css("margin-left", itemsIndent[draggingItemIndex] * 60 + "px");
    $("#parsons-result-indent").val(itemsIndent);
}

function updateValues() {
    const itemsInResult = resultList.querySelectorAll(".parsons-item");
    itemsValues = new Array(itemsValues.length).fill(-1);
    for (let i = 0; i < itemsInResult.length; i++) {
        let index = getIndex(itemsInResult[i]);
        itemsValues[index] = i;
    }
}

function updateResult(){
    let result = {
        lines: itemsValues,
        indent: itemsIndent
    };
    $(".parsons-result-input").val(JSON.stringify(result));
    console.log(result);
}

function getIndex(item){
    var splitted = item.id.split('-');
    return parseInt(splitted[splitted.length -1]);
}
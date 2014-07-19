window.addEventListener('blur', function (e) {
    var oldEl = e.target;
    if (isTd(oldEl)) {
        setTimeout(function () {
            onActiveElChanged(oldEl, document.activeElement);
        }, 1);
    }
}, true);

window.addEventListener('focus', function (e) {
    var el = e.target;
    if (isTd(el) && el.dataset.origval === undefined) {
        el.dataset.origval = el.textContent;
    }
}, true);

window.addEventListener('input', function (e) {
    var tdEl = e.target;
    if (isTd(tdEl)) {
        tdEl.classList.toggle('null', !tdEl.textContent.length);
    }
}, true);

function onActiveElChanged(oldEl, newEl) {
    if (!isTd(oldEl) ||
        tdElsAreInTheSameRow(newEl, oldEl) ||
        !rowIsDirty(oldEl.parentNode)) { return; }

    var trEl = oldEl.parentNode;
    var tdEls = trEl.childNodes;
    var tableEl = trEl.parentNode /* tbody */
                      .parentNode /* table */;
    var thEls = tableEl.childNodes[0 /* thead */]
                       .childNodes[0 /* tr */].childNodes;
    var colsCount = thEls.length;
    var changes = {};
    var key = {};
    for (var i = 1 /* skip # row header */; i < colsCount; i++) {
        var tdEl = tdEls[i];
        var thEl = thEls[i];
        if (thEl.dataset.key) {
            key[thEl.dataset.name] = cellOrigVal(tdEl);
        }
        if (cellIsDirty(tdEl)) {
            changes[thEl.dataset.name] = cellVal(tdEl);
        }
    }
    console.log(key, changes);

    var req = new XMLHttpRequest();
    req.open('POST', 'edit');
    req.onload = function (e) {
        if (e.target.status === 200) {
            Array.prototype.forEach.call(tdEls, function (tdEl) {
                delete tdEl.dataset.origval;
            });
        } else {
            alert(e.target.response);
        }
    };
    req.responseType = 'json';
    req.send(JSON.stringify({
        database: tableEl.dataset.database,
        table: tableEl.dataset.table,
        schema: tableEl.dataset.schema,
        action: 'update',
        changes: changes,
        where: key
    }));
}

function isTd(el) {
    return el && el.nodeName === 'TD';
}

function tdElsAreInTheSameRow(tdEl1, tdEl2) {
    return tdEl1.parentNode === tdEl2.parentNode;
}

function rowIsDirty(trEl) {
    return Array.prototype.some.call(trEl.childNodes, cellIsDirty);
}

function cellIsDirty(tdEl) {
    return tdEl.dataset.origval !== undefined &&
        tdEl.dataset.origval !== tdEl.textContent;
}

function cellOrigVal(tdEl) {
    return cellIsDirty(tdEl) ? tdEl.dataset.origval : cellVal(tdEl);
}

function cellVal(tdEl) {
    return tdEl.textContent.length === 0 ? null : tdEl.textContent;
}

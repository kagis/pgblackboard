'use strict';

// focus readonly cell expanding oversized content
window.addEventListener('click', function (e) {
    if (e.target.nodeName === 'TD'
        && e.target.cellIndex > 0
        && !e.target.tabindex
        && !e.target.parentNode/*TR*/.parentNode/*TBODY*/.parentNode/*TABLE*/.dataset.table /* is not editable */)
    {
        e.target.tabIndex = -1;
        e.target.focus();
    }
}, true);


// make row editable on click and save original values
// instead of using contenteditable attribute in html
// to reduce response size
window.addEventListener('click', function (e) {
    if (e.target.nodeName === 'TD'
        && e.target.contentEditable !== 'plaintext-only'
        && e.target.cellIndex > 0
        && e.target.parentNode/*TR*/.parentNode/*TBODY*/.parentNode/*TABLE*/.dataset.table /* is editable */)
    {
        var cells = e.target.parentNode.cells;
        for (var i = 1 /* skip # cell */; i < cells.length; i++) {
            var cell = cells[i];
            cell.contentEditable = 'plaintext-only';
            cell.dataset.origval = cell.textContent;
        }
        e.target.focus();
    }
}, true);


// fix blank row when input
window.addEventListener('input', function (e) {
    if (e.target.nodeName === 'TD') {
        var row = e.target.parentNode;
        var tBody = row.parentNode;
        if (tBody.classList.contains('has-blankrow') && tBody.lastChild === row) {
            row.dataset.inserting = true;
            var newBlankRow = document.createElement('TR');
            for (var i = 0; i < row.cells.length; i++) {
                newBlankRow.appendChild(document.createElement('TD'));
            }
            tBody.appendChild(newBlankRow);
        }

        var cell = e.target;
        var cellWasDirty = !!cell.dataset.dirty;
        var cellNowDirty = (cell.dataset.origval !== cell.textContent);
        cell.dataset.dirty = cellNowDirty || '';
        row.dataset.dirtycells = (+(row.dataset.dirtycells || 0) + (cellNowDirty - cellWasDirty)) || '';
    }
});


// submit dirty row when switch to another row
window.addEventListener('blur', function (e) {
    if (e.target.nodeName === 'TD'
        && e.target.parentNode/*TR*/.dataset.dirtycells)
    {
        var blurredEl = e.target;
        setTimeout(function () {
            var focusedEl = document.activeElement;
            if (blurredEl.parentNode/*TR*/ !== focusedEl.parentNode/*TR*/) {
                submitDirtyRow(blurredEl.parentNode);
            }
        }, 10);
    }
}, true);



function submitDirtyRow(row) {
    var cells = row.cells;
    var table = row.parentNode/*TBODY*/.parentNode/*TABLE*/;
    var headcells = table.tHead.rows[0].cells;

    var changes = {};
    var key = {};
    for (var i = 1 /* skip # row header */; i < cells.length; i++) {
        var cell = cells[i];
        var headcell = headcells[i];
        if (headcell.dataset.key) {
            key[headcell.dataset.name] = cell.dataset.origval || null;
        }
        if (cell.dataset.dirty) {
            changes[headcell.dataset.name] = cell.textContent || null;
        }
    }

    var req = new XMLHttpRequest();
    req.open('POST', 'edit');
    req.responseType = 'json';

    req.onload = function (e) {
        if (e.target.status === 200) {
            delete row.dataset.inserting;
            delete row.dataset.dirtycells;
            for (var i = 1; i < cells.length; i++) {
                var cell = cells[i]
                delete cell.dataset.origval;
                delete cell.dataset.dirty;
                cell.contentEditable = false;
                var returnedVal = e.target.response[headcells[i].dataset.name]
                if (returnedVal !== undefined) {
                    cell.textContent = returnedVal;
                }
            }
        } else {
            alert(e.target.response);
        }
    };

    req.send(JSON.stringify({
        action   : row.dataset.inserting ? 'insert' : 'update',
        database : table.dataset.database,
        table    : table.dataset.table,
        schema   : table.dataset.schema,
        changes  : changes,
        where    : key
    }));
}

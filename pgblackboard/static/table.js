(function () {
'use strict';

function onCell(eventType, handler) {
    window.addEventListener(eventType, function (e) {
        if (e.target.nodeName === 'TD' &&
            e.target.cellIndex > 0 &&
            e.target.parentNode.parentNode.parentNode.classList.contains('rowset'))
        {
            handler(
                e.target,
                e.target.parentNode,
                e.target.parentNode.parentNode.parentNode
            );
        }
    }, true);
}

// focus readonly cell expanding oversized content
onCell('click', function (clickedCell, row, table) {
    if (!clickedCell.tabindex && !table.dataset.table /* is not editable */) {
        clickedCell.tabIndex = -1;
        clickedCell.focus();
    }
});


// make row editable on click and save original values
// instead of using contenteditable attribute in html
// to reduce response size
onCell('click', function (clickedCell, row, table) {
    if (
        // skip if already editable
        clickedCell.contentEditable !== 'plaintext-only' &&

        // not allow focus when row is submitting
        !row.classList.contains('submitting-row') &&

        // can focus only when table is updatable/insertable
        table.dataset.table)
    {
        var cells = row.cells;
        for (var i = 1 /* skip row header */; i < cells.length; i++) {
            var cell = cells[i];
            cell.contentEditable = 'plaintext-only';

            // save original values
            if (!('origval' in cell.dataset)) {
                cell.dataset.origval = cell.textContent;
            }
        }
        clickedCell.focus();
    }
});


// fix blank row when input
onCell('input', function (editingCell, editingRow) {
    var tBody = editingRow.parentNode;
    if (tBody.classList.contains('has-blankrow') && tBody.lastChild === editingRow) {
        editingRow.dataset.inserting = true;
        var newBlankRow = document.createElement('TR');
        for (var i = 0; i < editingRow.cells.length; i++) {
            newBlankRow.appendChild(document.createElement('TD'));
        }
        tBody.appendChild(newBlankRow);
    }
    var cellWasDirty = !!editingCell.dataset.dirty;
    var cellNowDirty = (editingCell.dataset.origval !== editingCell.textContent);
    editingCell.dataset.dirty = cellNowDirty || '';
    editingRow.dataset.dirtycells = (+(editingRow.dataset.dirtycells || 0) + (cellNowDirty - cellWasDirty)) || '';
});


// submit dirty row when switch to another row
onCell('blur', function (blurredCell, blurredRow) {
    setTimeout(function () {
        var focusedEl = document.activeElement;
        if (blurredRow !== focusedEl.parentNode/*TR*/) {

            // disable editing on blurred row
            for (var i = blurredRow.cells.length - 1; i >= 1; i--) {
                blurredRow.cells[i].contentEditable = false;
            }

            submitDirtyRow(blurredRow);
        }
    }, 10);
});


function submitDirtyRow(row) {
    row.classList.remove('invalid-row');

    if (!row.dataset.dirtycells) {
        return;
    }

    var cells = row.cells;
    var table = row.parentNode/*TBODY*/.parentNode/*TABLE*/;
    var headcells = table.tHead.rows[0].cells;

    row.classList.add('submitting-row');

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
    req.onloadend = onLoadEnd;
    req.onload = onLoad;
    req.send(JSON.stringify({
        action   : row.dataset.inserting ? 'insert' : 'update',
        database : table.dataset.database,
        table    : table.dataset.table,
        schema   : table.dataset.schema,
        changes  : changes,
        where    : key
    }));


    function onLoad(e) {
        if (e.target.status === 200) {

            // row is not dirty since it successfully submitted
            delete row.dataset.dirtycells;
            delete row.dataset.inserting;
            row.classList.remove('invalid-row');

            for (var i = 1; i < cells.length; i++) {
                var cell = cells[i];

                // invalidate original value
                delete cell.dataset.origval;
                delete cell.dataset.dirty;

                // refresh cell with actual inserted/updated value
                var returnedVal = e.target.response[headcells[i].dataset.name];
                if (returnedVal !== undefined) {
                    cell.innerHTML = returnedVal;
                }
            }
        } else {
            row.classList.add('invalid-row');
            alert(e.target.response);
        }
    }

    function onLoadEnd() {
        row.classList.remove('submitting-row');
    }
}

})();

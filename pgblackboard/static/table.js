(function () {
'use strict';


function onCell(eventType, handler) {
    window.addEventListener(eventType, function (e) {
        if (e.target.nodeName === 'TD' &&
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
onCell('mousedown', function (clickedCell, row, table) {
    if (!tableIsEditable(table)) {
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
        !row.classList.contains('rowset-submitting-row') &&

        // can focus only when table is updatable/insertable
        tableIsEditable(table))
    {
        var cells = row.cells;
        for (var i = 1 /* skip row header */; i < cells.length; i++) {
            var cell = cells[i];
            saveCellOriginalValue(cell);
            cell.contentEditable = 'plaintext-only';
        }
        clickedCell.focus();
    }
});


// fix blank row when input
onCell('input', function (editingCell, editingRow, table) {
    var tBody = editingRow.parentNode;
    if (table.classList.contains('rowset-has-blankrow') && tBody.lastChild === editingRow) {
        editingRow.setAttribute('data-inserting', 'true');
        var newBlankRow = document.createElement('TR');
        newBlankRow.appendChild(document.createElement('TH'));
        for (var i = 1; i < editingRow.cells.length; i++) {
            newBlankRow.appendChild(document.createElement('TD'));
        }
        tBody.appendChild(newBlankRow);
    }

    if (getCellOriginalValue(editingCell) === getCellValue(editingCell)) {
        editingCell.removeAttribute('data-dirty');
    } else {
        editingCell.setAttribute('data-dirty', 'true');
    }
});


onCell('input', function (editingCell) {
    if (editingCell.textContent) {
        editingCell.classList.remove('emptystr');
    }
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
    row.classList.remove('rowset-invalid-row');

    if (!rowIsDirty(row)) {
        return;
    }

    var cells = row.cells;
    var table = row.parentNode/*TBODY*/.parentNode/*TABLE*/;
    var headcells = table.tHead.rows[0].cells;

    row.classList.add('rowset-submitting-row');

    var changes = {};
    var key = {};
    for (var i = 1 /* skip # row header */; i < cells.length; i++) {
        var cell = cells[i];
        var headcell = headcells[i];
        var colName = headcell.getAttribute('data-name');
        if (headcell.hasAttribute('data-key')) {
            key[colName] = getCellOriginalValue(cell);
        }
        if (cellIsDirty(cell)) {
            changes[colName] = getCellValue(cell);
        }
    }

    var req = new XMLHttpRequest();
    req.open('POST', 'edit');
    req.responseType = 'json';
    req.onloadend = onLoadEnd;
    req.onload = onLoad;
    req.send(JSON.stringify({
        action   : row.hasAttribute('data-inserting') ? 'insert' : 'update',
        database : table.getAttribute('data-database'),
        table    : table.getAttribute('data-table'),
        schema   : table.getAttribute('data-schema'),
        changes  : changes,
        where    : key
    }));


    function onLoad(e) {
        if (e.target.status === 200) {
            delete row.removeAttribute('data-inserting');
            row.classList.remove('rowset-invalid-row');

            for (var i = 1; i < cells.length; i++) {
                var cell = cells[i];

                // cells are not dirty since row successfully submitted
                invalidateCellOriginalValue(cell);

                // refresh cell with actual inserted/updated value
                var colName = headcells[i].getAttribute('data-name');
                var returnedVal = e.target.response[colName];
                if (returnedVal !== undefined) {
                    cell.innerHTML = returnedVal;
                }
            }
        } else {
            row.classList.add('rowset-invalid-row');
            alert(e.target.response);
        }
    }

    function onLoadEnd() {
        row.classList.remove('rowset-submitting-row');
    }
}



function getCellValue(cell) {
    return cell.textContent || (
        cell.classList.contains('emptystr') ? '' : null
    );
}

function setCellValue(cell, newValue) {
    cell.textContent = newValue;
    cell.classList.toggle('emptystr', newValue === '');
}

function getCellOriginalValue(cell) {
    return cell.getAttribute('data-origval') || (
        cell.hasAttribute('data-origval-emptystr') ? '' : null
    );
}

function saveCellOriginalValue(cell) {
    if (!cellIsDirty(cell)) {
        cell.setAttribute('data-origval', cell.textContent);
        if (cell.classList.contains('emptystr')) {
            cell.setAttribute('data-origval-emptystr', 'true');
        }
    }
}

function invalidateCellOriginalValue(cell) {
    cell.removeAttribute('data-origval');
    cell.removeAttribute('data-origval-emptystr');
    cell.removeAttribute('data-dirty');
}

function cellIsDirty(cell) {
    return !!cell.getAttribute('data-dirty');
}

function rowIsDirty(row) {
    for (var i = row.cells.length - 1; i >= 1; i--) {
        if (cellIsDirty(row.cells[i])) {
            return true;
        }
    };
    return false;
}

function tableIsEditable(table) {
    return table.hasAttribute('data-table');
}


})();

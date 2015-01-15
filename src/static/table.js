(function () {
'use strict';


var CONTENT_EDITABLE = 'true';
if (navigator.userAgent.indexOf('AppleWebKit') !== -1) {
    CONTENT_EDITABLE = 'plaintext-only';
}


function onCell(eventType, handler) {
    window.addEventListener(eventType, function (e) {
        if (e.target.nodeName === 'TD' &&
            hasClass(e.target.parentNode.parentNode.parentNode, 'rowset'))
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
        clickedCell.contentEditable !== CONTENT_EDITABLE &&

        // not allow focus when row is submitting
        !hasClass(row, 'rowset-submitting-row') &&

        // can focus only when table is updatable/insertable
        tableIsEditable(table))
    {
        var cells = row.cells;
        for (var i = 1 /* skip row header */; i < cells.length; i++) {
            var cell = cells[i];
            saveCellOriginalValue(cell);
            cell.contentEditable = CONTENT_EDITABLE;
        }
        clickedCell.focus();
    }
});


// fix blank row when input
onCell('input', function (editingCell, editingRow, table) {
    var tBody = editingRow.parentNode;
    if (hasClass(table, 'rowset-has-blankrow') && tBody.lastChild === editingRow) {
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
        removeClass(editingCell, 'emptystr');
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
    removeClass(row, 'rowset-invalid-row');

    if (!rowIsDirty(row)) {
        return;
    }

    var cells = row.cells;
    var table = row.parentNode/*TBODY*/.parentNode/*TABLE*/;
    var headcells = table.tHead.rows[0].cells;

    addClass(row, 'rowset-submitting-row');

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
            var response = JSON.parse(e.target.responseText);

            row.removeAttribute('data-inserting');
            removeClass(row, 'rowset-invalid-row');

            for (var i = 1; i < cells.length; i++) {
                var cell = cells[i];

                // cells are not dirty since row successfully submitted
                invalidateCellOriginalValue(cell);

                // refresh cell with actual inserted/updated value
                var colName = headcells[i].getAttribute('data-name');
                var returnedVal = response[colName];
                if (returnedVal !== undefined) {
                    cell.innerHTML = returnedVal;
                }
            }
        } else {
            addClass(row, 'rowset-invalid-row');
            alert(e.target.responseText);
        }
    }

    function onLoadEnd() {
        removeClass(row, 'rowset-submitting-row');
    }
}



function getCellValue(cell) {
    return cell.textContent || (
        hasClass(cell, 'emptystr') ? '' : null
    );
}

function setCellValue(cell, newValue) {
    cell.textContent = newValue;
    toggleClass(cell, 'emptystr', newValue === '');
}

function getCellOriginalValue(cell) {
    return cell.getAttribute('data-origval') || (
        cell.hasAttribute('data-origval-emptystr') ? '' : null
    );
}

function saveCellOriginalValue(cell) {
    if (!cellIsDirty(cell)) {
        cell.setAttribute('data-origval', cell.textContent);
        if (hasClass(cell, 'emptystr')) {
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
    }
    return false;
}

function tableIsEditable(table) {
    return table.hasAttribute('data-table');
}


var hasClass,
    removeClass,
    addClass,
    toggleClass;

if ('classList' in document.createElement('_')) {
    // classList expected to be faster
    hasClass = function (node, class_) {
        return node.classList.contains(class_);
    };

    removeClass = function (node, class_) {
        node.classList.remove(class_);
    };

    addClass = function (node, class_) {
        node.classList.add(class_);
    };

    toggleClass = function (node, class_, shouldHaveClass) {
        node.classList.toggle(class_, shouldHaveClass);
    };
} else {
    hasClass = function (node, class_) {
        return (' ' + node.className + ' ').indexOf(' ' + class_ + ' ') !== -1;
    };

    removeClass = function (node, class_) {
        node.className = node.className
            .replace(new RegExp('\\b' + class_ + '\\b', 'g'))
            .trim();
    };

    addClass = function (node, class_) {
        node.className += ' ' + class_;
    };

    toggleClass = function (node, class_, shouldHaveClass) {
        if (hasClass(node, class_)) {
            if (!shouldHaveClass) {
                removeClass(node, class_);
            }
        } else {
            if (shouldHaveClass) {
                addClass(node, class_);
            }
        }
    };
}

})();

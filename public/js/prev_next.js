function Rprev(){
    const prevIdx = document.querySelector('.edit-button[data-prev]').dataset.prev;
    window.location.href = '/reviewdetail?idx=' + prevIdx;
}
function Rnext(){
    const nextIdx = document.querySelector('.edit-button[data-next]').dataset.next;
    window.location.href = '/reviewdetail?idx=' + nextIdx;
}
function Redit(){
    const editIdx = document.querySelector('.edit-button[data-edit]').dataset.edit;
    window.location.href = '/editReviewpage?idx=' + editIdx;
}

function Newsprev(){
    const prevIdx = document.querySelector('.edit-button[data-prev]').dataset.prev;
    window.location.href = '/newsdetail?idx=' + prevIdx;
}
function Newsnext(){
    const nextIdx = document.querySelector('.edit-button[data-next]').dataset.next;
    window.location.href = '/newsdetail?idx=' + nextIdx;
}
function Newsedit(){
    const editIdx = document.querySelector('.edit-button[data-edit]').dataset.edit;
    window.location.href = '/editnewspage?idx=' + editIdx;
}

function Nprev(){
    const prevIdx = document.querySelector('.edit-button[data-prev]').dataset.prev;
    window.location.href = '/noticedetail?idx=' + prevIdx;
}
function Nnext(){
    const nextIdx = document.querySelector('.edit-button[data-next]').dataset.next;
    window.location.href = '/noticedetail?idx=' + nextIdx;
}
function Nedit(){
    const editIdx = document.querySelector('.edit-button[data-edit]').dataset.edit;
    window.location.href = '/editnoticepage?idx=' + editIdx;
}

function Sprev(){
    const prevIdx = document.querySelector('.edit-button[data-prev]').dataset.prev;
    window.location.href = '/Shopdetail?idx=' + prevIdx;
}
function Snext(){
    const nextIdx = document.querySelector('.edit-button[data-next]').dataset.next;
    window.location.href = '/Shopdetail?idx=' + nextIdx;
}
function Sedit(){
    const editIdx = document.querySelector('.edit-button[data-edit]').dataset.edit;
    window.location.href = '/editShoppage?idx=' + editIdx;
}






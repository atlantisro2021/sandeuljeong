function admin_side(){
    document.getElementById(`admin_side`).style.left = `82px`;
    document.getElementById(`review_side`).style.left = `-82px`;
    document.getElementById(`notice_side`).style.left = `-82px`;
    document.getElementById(`side_1`).style.opacity = `100%`;
    document.getElementById(`side_2`).style.opacity = `40%`;
    document.getElementById(`side_3`).style.opacity = `40%`;
    document.getElementById(`side_4`).style.opacity = `40%`;
}

function review_side(){
    document.getElementById(`review_side`).style.left = `82px`;
    document.getElementById(`admin_side`).style.left = `-82px`;
    document.getElementById(`notice_side`).style.left = `-82px`;
    document.getElementById(`side_1`).style.opacity = `40%`;
    document.getElementById(`side_2`).style.opacity = `100%`;
    document.getElementById(`side_3`).style.opacity = `40%`;
    document.getElementById(`side_4`).style.opacity = `40%`;
}

function notice_side(){
    document.getElementById(`notice_side`).style.left = `82px`;
    document.getElementById(`admin_side`).style.left = `-82px`;
    document.getElementById(`review_side`).style.left = `-82px`;
    document.getElementById(`side_1`).style.opacity = `40%`;
    document.getElementById(`side_2`).style.opacity = `40%`;
    document.getElementById(`side_3`).style.opacity = `100%`;
    document.getElementById(`side_4`).style.opacity = `40%`;
}

function closed_menu(){
    document.getElementById(`notice_side`).style.left = `-82px`;
    document.getElementById(`admin_side`).style.left = `-82px`;
    document.getElementById(`review_side`).style.left = `-82px`;
    document.getElementById(`side_1`).style.opacity = `40%`;
    document.getElementById(`side_2`).style.opacity = `40%`;
    document.getElementById(`side_3`).style.opacity = `40%`;
    document.getElementById(`side_4`).style.opacity = `100%`;
}
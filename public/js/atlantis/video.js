const v = document.getElementById("vid");
const s = document.getElementById("src");

function changeVideo1() {
    v.classList.add("loading");

    s.src = '';
    v.load();

    v.addEventListener("loadeddata", function() {
        v.classList.remove("loading");
        v.classList.add("loaded");
        v.play();
    });
}

function changeVideo2() {
    s.src = '/public/video/video1.mp4';
    v.load();

    v.addEventListener("loadeddata", function() {
        v.classList.remove("loading");
        v.classList.add("loaded");
        v.play();
    });
}

function changeVideo3() {
    s.src = '/public/video/video1.mp4';
    v.load();

    v.addEventListener("loadeddata", function() {
        v.classList.remove("loading");
        v.classList.add("loaded");
        v.play();
    });
}

function changeVideo4() {
    s.src = '/public/video/video1.mp4';
    v.load();

    v.addEventListener("loadeddata", function() {
        v.classList.remove("loading");
        v.classList.add("loaded");
        v.play();
    });
}

document.getElementById("01").addEventListener("click", changeVideo1);
document.getElementById("02").addEventListener("click", changeVideo2);
document.getElementById("03").addEventListener("click", changeVideo3);
document.getElementById("04").addEventListener("click", changeVideo4);

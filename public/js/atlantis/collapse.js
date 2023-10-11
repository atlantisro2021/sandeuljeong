function collapse(element) {
    var content = element.nextElementSibling;

    // 현재 클릭한 버튼과 활성화된 버튼을 가져옵니다.
    var currentActiveButton = document.querySelector(".collapsible.active");

    // 현재 활성화된 버튼이 있고 그것이 현재 클릭한 버튼이 아니라면 닫습니다.
    if (currentActiveButton && currentActiveButton !== element) {
        currentActiveButton.classList.remove("active");
        currentActiveButton.nextElementSibling.style.maxHeight = null;
    }

    // 현재 클릭한 버튼을 열거나 닫습니다.
    if (content.style.maxHeight != 0) {
        content.style.maxHeight = null;
        element.classList.remove("active");
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        element.classList.add("active");
    }
}

// 페이지 로딩 후 제목 1 내용을 펼치도록 설정
document.addEventListener("DOMContentLoaded", function () {
    var initialButton = document.querySelector(".collapsible");
    collapse(initialButton);
});
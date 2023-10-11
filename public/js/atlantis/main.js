const swiper1 = new Swiper('.swiper.first', {
    // Optional parameters
    spaceBetween: 0,
    slidesOffsetAfter: 0,
    direction: 'vertical',
    loop: true,

    // If we need pagination
    pagination: {
        el: '.swiper-pagination',
        dynamicBullets: true,
    },
});

var swiper2 = new Swiper(".mySwiper.second", {
    slidesPerView: 4,
    spaceBetween: 5,
    breakpoints: { //반응형
        // 화면의 넓이가 320px 이상일 때
        0: {
            slidesPerView: 1
        },
        600: {
            slidesPerView: 2,
            spaceBetween: 20
        },
        1000: {
            slidesPerView: 3,
            spaceBetween: 20
        },
        // 화면의 넓이가 640px 이상일 때
        1300: {
            slidesPerView: 4,
            spaceBetween: 40
        }
    }
    // pagination: {
    //     el: ".swiper-pagination",1
    // },
});

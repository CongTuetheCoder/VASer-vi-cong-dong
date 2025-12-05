document.addEventListener("DOMContentLoaded", function() {
    // Hiệu ứng cuộn trang (Scroll Animation)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.15 // Kích hoạt khi thấy 15% phần tử
    });
 
    const hiddenElements = document.querySelectorAll('.fade-in');
    hiddenElements.forEach((el) => observer.observe(el));
});
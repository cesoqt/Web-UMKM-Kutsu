// =====================================================
// IMPORT FIREBASE SDK
// =====================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// =====================================================
// KONFIGURASI FIREBASE
// Catatan: databaseURL wajib dari Realtime Database
// =====================================================
const firebaseConfig = {
    apiKey: "AIzaSyDKr7jhIW_Z0LfpJVqU0ol38gyQQ-MNdiA",
    authDomain: "web-umkm-kutsu.firebaseapp.com",
    databaseURL: "https://web-umkm-kutsu-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "web-umkm-kutsu",
    storageBucket: "web-umkm-kutsu.firebasestorage.app",
    messagingSenderId: "720614761074",
    appId: "1:720614761074:web:f8c9dcfa9ca6f995b8d8eb",
    measurementId: "G-T3FTZWYCL1"
};


// =====================================================
// INISIALISASI FIREBASE
// =====================================================
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);


// =====================================================
// HELPER: MENCEGAH TEKS DARI DATABASE MERUSAK HTML
// =====================================================
function escapeHTML(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =====================================================
// FITUR 1: HAMBURGER MENU MOBILE
// =====================================================
function setupMobileMenu() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileMenuItems = document.querySelectorAll(".mobile-menu a, .mobile-menu button");

    if (!hamburgerBtn || !mobileMenu) return;

    hamburgerBtn.addEventListener("click", () => {
        const isOpen = mobileMenu.classList.toggle("show");

        hamburgerBtn.classList.toggle("active", isOpen);
        document.body.classList.toggle("menu-open", isOpen);

        hamburgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        hamburgerBtn.setAttribute("aria-label", isOpen ? "Tutup menu navigasi" : "Buka menu navigasi");
    });

    mobileMenuItems.forEach((item) => {
        item.addEventListener("click", () => {
            mobileMenu.classList.remove("show");
            hamburgerBtn.classList.remove("active");
            document.body.classList.remove("menu-open");

            hamburgerBtn.setAttribute("aria-expanded", "false");
            hamburgerBtn.setAttribute("aria-label", "Buka menu navigasi");
        });
    });
}


// =====================================================
// FITUR 2: MENAMPILKAN KOMENTAR DARI FIREBASE
// Data diambil dari node: testimonials
// =====================================================
async function loadTestimonials() {
    const testimonialList = document.getElementById("testimonialList");

    if (!testimonialList) return;

    testimonialList.innerHTML = `
        <div class="testimonial-card">
            <p class="testimonial-comment">Memuat komentar pelanggan...</p>
        </div>
    `;

    try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, "testimonials"));

        if (!snapshot.exists()) {
            testimonialList.innerHTML = `
                <div class="testimonial-card">
                    <p class="testimonial-comment">Belum ada komentar pelanggan.</p>
                </div>
            `;
            return;
        }

        const data = snapshot.val();
        const testimonials = Object.values(data);

        testimonialList.innerHTML = testimonials.map((item) => {
            const rating = Math.max(0, Math.min(5, Number(item.rating) || 0));
            const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

            return `
                <div class="testimonial-card">
                    <div class="testimonial-stars">${stars}</div>

                    <p class="testimonial-comment">
                        "${escapeHTML(item.comment)}"
                    </p>

                    <div class="testimonial-user">
                        <h3>${escapeHTML(item.name)}</h3>
                        <span>${escapeHTML(item.service)}</span>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        testimonialList.innerHTML = `
            <div class="testimonial-card">
                <p class="testimonial-comment">Komentar gagal dimuat dari Firebase.</p>
            </div>
        `;

        console.error("Firebase testimonial error:", error);
    }
}


// =====================================================
// FITUR 3: MENENTUKAN POSISI TIMELINE BERDASARKAN STATUS
// Status Firebase:
// Waiting, On Progress, Drying, Done
// =====================================================
function getOrderStep(status) {
    const normalizedStatus = String(status ?? "").toLowerCase();

    if (normalizedStatus.includes("done") || normalizedStatus.includes("selesai")) {
        return 4;
    }

    if (normalizedStatus.includes("drying") || normalizedStatus.includes("pengeringan")) {
        return 3;
    }

    if (normalizedStatus.includes("progress") || normalizedStatus.includes("diproses")) {
        return 2;
    }

    return 1;
}


// =====================================================
// FITUR 4: MEMBUAT HTML TIMELINE STATUS PESANAN
// =====================================================
function generateTimeline(currentStep) {
    const steps = [
        {
            title: "Pesanan Diterima",
            desc: "Data pesanan sudah masuk ke sistem."
        },
        {
            title: "Sedang Diproses",
            desc: "Barang sedang dalam proses cleaning/treatment."
        },
        {
            title: "Pengeringan",
            desc: "Barang sedang dikeringkan dan dicek ulang."
        },
        {
            title: "Selesai",
            desc: "Barang sudah siap diambil atau dikirim."
        }
    ];

    return `
        <div class="order-timeline">
            ${steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber <= currentStep;

                return `
                    <div class="timeline-item ${isActive ? "active" : ""}">
                        <div class="timeline-dot">
                            ${isActive ? "✓" : stepNumber}
                        </div>

                        <div class="timeline-content">
                            <h4>${step.title}</h4>
                            <p>${step.desc}</p>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}


// =====================================================
// FITUR 5: CEK STATUS PESANAN DARI FIREBASE
// Data diambil dari node: orders/KODE_PESANAN
// =====================================================
async function checkOrderStatus() {
    const statusInputCode = document.getElementById("statusInputCode");
    const statusResult = document.getElementById("statusResult");

    if (!statusInputCode || !statusResult) return;

    const inputVal = statusInputCode.value.trim().toUpperCase();

    if (!inputVal) {
        statusResult.innerHTML = `
            <div class="status-card error">
                <h3>Kode belum diisi</h3>
                <p>Silakan masukkan kode pesanan terlebih dahulu.</p>
            </div>
        `;
        return;
    }

    statusResult.innerHTML = `
        <div class="status-card">
            <h3>Mengecek pesanan...</h3>
            <p>Mohon tunggu sebentar.</p>
        </div>
    `;

    try {
        const dbRef = ref(database);

        // Timeout supaya halaman tidak stuck loading kalau Firebase lambat/error
        const timeout = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Timeout: Firebase terlalu lama merespons."));
            }, 8000);
        });

        const request = get(child(dbRef, `orders/${inputVal}`));
        const snapshot = await Promise.race([request, timeout]);

        if (!snapshot.exists()) {
            statusResult.innerHTML = `
                <div class="status-card error">
                    <h3>Kode tidak ditemukan</h3>
                    <p>Kode <strong>${escapeHTML(inputVal)}</strong> belum ada di database Firebase.</p>
                </div>
            `;
            return;
        }

        const order = snapshot.val();
        const currentStep = getOrderStep(order.status);
        const timelineHTML = generateTimeline(currentStep);

        statusResult.innerHTML = `
            <div class="status-card">
                <div class="status-badge">${escapeHTML(order.status)}</div>
                <h3>${escapeHTML(inputVal)}</h3>

                ${timelineHTML}

                <div class="status-detail">
                    <p><strong>Nama:</strong> ${escapeHTML(order.name)}</p>
                    <p><strong>Layanan:</strong> ${escapeHTML(order.service)}</p>
                    <p><strong>Barang:</strong> ${escapeHTML(order.item)}</p>
                    <p><strong>Keterangan:</strong> ${escapeHTML(order.description)}</p>
                    <p><strong>Estimasi:</strong> ${escapeHTML(order.estimated)}</p>
                </div>
            </div>
        `;

    } catch (error) {
        statusResult.innerHTML = `
            <div class="status-card error">
                <h3>Gagal mengambil data</h3>
                <p>${escapeHTML(error.message)}</p>
                <p>Cek kembali konfigurasi Firebase, databaseURL, rules, dan koneksi internet.</p>
            </div>
        `;

        console.error("Firebase order error:", error);
    }
}


// =====================================================
// FITUR 6: ENTER UNTUK CEK STATUS PESANAN
// =====================================================
function setupStatusEnterKey() {
    const statusInputCode = document.getElementById("statusInputCode");

    if (!statusInputCode) return;

    statusInputCode.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            checkOrderStatus();
        }
    });
}

// =====================================================
// FITUR: ACTIVE NAVBAR BERDASARKAN POSISI SCROLL
// Garis bawah navbar akan pindah sesuai section aktif
// =====================================================
function setupActiveNavbar() {
    const navLinks = document.querySelectorAll(
        ".nav-links a[href^='#'], .mobile-menu a[href^='#']:not(.btn)"
    );

    const sectionIds = Array.from(navLinks)
        .map((link) => link.getAttribute("href"))
        .filter((href) => href && href !== "#")
        .map((href) => href.replace("#", ""));

    const sections = sectionIds
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    if (!navLinks.length || !sections.length) return;

    function setActiveLink(activeId) {
        navLinks.forEach((link) => {
            const linkTarget = link.getAttribute("href");

            if (linkTarget === `#${activeId}`) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }

    function updateActiveNavbar() {
        const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
        const scrollPosition = window.scrollY + navbarHeight + 120;

        let currentSectionId = "";

        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (
                scrollPosition >= sectionTop &&
                scrollPosition < sectionTop + sectionHeight
            ) {
                currentSectionId = section.id;
            }
        });

        if (currentSectionId) {
            setActiveLink(currentSectionId);
        } else {
            navLinks.forEach((link) => link.classList.remove("active"));
        }
    }

    window.addEventListener("scroll", updateActiveNavbar);
    window.addEventListener("load", updateActiveNavbar);

    updateActiveNavbar();
}


// =====================================================
// MENJALANKAN SEMUA FITUR SETELAH HTML SIAP
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenu();
    setupStatusEnterKey();
    setupActiveNavbar();
    loadTestimonials();
});


// =====================================================
// MEMBUAT FUNCTION BISA DIPANGGIL DARI HTML
// Karena script.js memakai type="module"
// =====================================================
window.checkOrderStatus = checkOrderStatus;
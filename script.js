document.addEventListener("DOMContentLoaded", () => {
    // 1. Dynamic URL Calculation for Catalog Link
    const catalogInput = document.getElementById("catalog-url");
    const copyBtn = document.getElementById("copy-btn");
    const copyStatus = document.getElementById("copy-status");

    // Detect environment
    const isLocal = window.location.protocol === "file:";
    let catalogUrl = "";

    if (isLocal) {
        // Fallback mock url for local testing
        catalogUrl = "https://globalgameretro.github.io/retrogameslink/games.json";
    } else {
        // Compute path based on current domain and path (works for github pages)
        const cleanPath = window.location.pathname.endsWith("/") 
            ? window.location.pathname.slice(0, -1) 
            : window.location.pathname;
        catalogUrl = `${window.location.origin}${cleanPath}/games.json`;
    }

    catalogInput.value = catalogUrl;

    // Copy to clipboard function
    const copyTextToClipboard = async (text, statusElement) => {
        try {
            await navigator.clipboard.writeText(text);
            statusElement.style.display = "block";
            setTimeout(() => {
                statusElement.style.display = "none";
            }, 3000);
        } catch (err) {
            console.error("Failed to copy: ", err);
            // Fallback for older browsers
            catalogInput.select();
            document.execCommand("copy");
            statusElement.style.display = "block";
            setTimeout(() => {
                statusElement.style.display = "none";
            }, 3000);
        }
    };

    copyBtn.addEventListener("click", () => {
        copyTextToClipboard(catalogInput.value, copyStatus);
    });

    // 2. Base64 Encoder Tool for Admin
    const rawUrlInput = document.getElementById("raw-url");
    const encodeBtn = document.getElementById("encode-btn");
    const base64ResultInput = document.getElementById("base64-result");
    const copyResultBtn = document.getElementById("copy-result-btn");

    encodeBtn.addEventListener("click", () => {
        const rawUrl = rawUrlInput.value.trim();
        if (!rawUrl) {
            alert("Vui lòng nhập đường link tải trực tiếp!");
            return;
        }

        try {
            // Encode using UTF-8 safe base64
            const encoded = btoa(encodeURIComponent(rawUrl).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode(parseInt(p1, 16));
            }));
            base64ResultInput.value = encoded;
        } catch (e) {
            alert("Có lỗi xảy ra khi mã hóa link: " + e.message);
        }
    });

    copyResultBtn.addEventListener("click", () => {
        const resultText = base64ResultInput.value.trim();
        if (!resultText) {
            alert("Không có dữ liệu mã hóa để sao chép!");
            return;
        }

        navigator.clipboard.writeText(resultText).then(() => {
            const originalText = copyResultBtn.innerText;
            copyResultBtn.innerText = "Copied!";
            copyResultBtn.style.background = "#10b981";
            copyResultBtn.style.color = "#fff";
            setTimeout(() => {
                copyResultBtn.innerText = originalText;
                copyResultBtn.style.background = "";
                copyResultBtn.style.color = "";
            }, 2000);
        }).catch(err => {
            console.error("Failed to copy results: ", err);
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // Repository Configuration
    const GH_OWNER = "globalgameretro";
    const GH_REPO = "retrogameslink";
    const GH_PATH = "games.json";
    const GH_BRANCH = "main";

    // --- Dynamic URL for copy box ---
    const catalogInput = document.getElementById("catalog-url");
    const copyBtn = document.getElementById("copy-btn");
    const copyStatus = document.getElementById("copy-status");
    const isLocal = window.location.protocol === "file:";
    let catalogUrl = "";

    if (isLocal) {
        catalogUrl = `https://${GH_OWNER}.github.io/${GH_REPO}/games.json`;
    } else {
        const cleanPath = window.location.pathname.endsWith("/") 
            ? window.location.pathname.slice(0, -1) 
            : window.location.pathname;
        catalogUrl = `${window.location.origin}${cleanPath}/games.json`;
    }
    catalogInput.value = catalogUrl;

    // Clipboard Copy Helper
    const copyTextToClipboard = async (text, statusElement) => {
        try {
            await navigator.clipboard.writeText(text);
            statusElement.style.display = "block";
            setTimeout(() => { statusElement.style.display = "none"; }, 3000);
        } catch (err) {
            catalogInput.select();
            document.execCommand("copy");
            statusElement.style.display = "block";
            setTimeout(() => { statusElement.style.display = "none"; }, 3000);
        }
    };

    copyBtn.addEventListener("click", () => {
        copyTextToClipboard(catalogInput.value, copyStatus);
    });

    // --- UTF-8 Safe Base64 Helper Functions ---
    const encodeBase64 = (str) => {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    };

    const decodeBase64 = (str) => {
        try {
            return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch (e) {
            return atob(str); // Fallback
        }
    };

    // --- Game Catalog Preview Gallery ---
    const gameGallery = document.getElementById("game-gallery");
    const galleryLoading = document.getElementById("gallery-loading");

    const renderPreviewGallery = (games) => {
        gameGallery.innerHTML = "";
        if (!games || games.length === 0) {
            gameGallery.innerHTML = "<div class='gallery-info'>No games in catalog.</div>";
            return;
        }
        
        games.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";
            
            // Image cover or placeholder
            const cover = game.coverFrontUrl || game.coverUrl || game.cover || game.image;
            let coverHtml = `<div class="game-cover-placeholder">🎮</div>`;
            if (cover) {
                coverHtml = `<img src="${cover}" alt="${game.title} cover" class="game-cover-img" onerror="this.style.display='none'; this.parentNode.innerHTML='🎮';">`;
            }
            
            card.innerHTML = `
                <div class="game-cover-container">
                    ${coverHtml}
                </div>
                <div class="game-card-info">
                    <h4 class="game-card-title" title="${game.title}">${game.title}</h4>
                </div>
            `;
            gameGallery.appendChild(card);
        });
    };

    const loadLocalGamesFile = async () => {
        try {
            // Fetch relative to page to bypass CORS
            const response = await fetch("games.json?t=" + Date.now());
            if (response.ok) {
                const games = await response.json();
                renderPreviewGallery(games);
                if (galleryLoading) galleryLoading.style.display = "none";
                return games;
            } else {
                throw new Error("Unable to read local games.json");
            }
        } catch (e) {
            console.error("Gallery loading error: ", e);
            if (galleryLoading) galleryLoading.innerHTML = "Unable to load games preview. Make sure games.json is uploaded.";
            return null;
        }
    };

    // Load gallery on page load
    let currentLiveGames = [];
    loadLocalGamesFile().then(games => {
        if (games) currentLiveGames = games;
    });

    // --- Admin CMS Panel ---
    const adminCard = document.getElementById("admin-card");
    const tokenInput = document.getElementById("github-token");
    const toggleTokenBtn = document.getElementById("toggle-token-btn");
    const saveTokenBtn = document.getElementById("save-token-btn");
    const clearTokenBtn = document.getElementById("clear-token-btn");
    const statusLight = document.getElementById("status-light");
    const statusText = document.getElementById("status-text");
    const cmsWorkspace = document.getElementById("cms-workspace");
    
    // CRUD elements
    const gamesTableBody = document.getElementById("games-table-body");
    const gamesCountSpan = document.getElementById("games-count");
    const gameForm = document.getElementById("game-form");
    const formTitle = document.getElementById("form-title");
    const editIndexInput = document.getElementById("edit-index");
    
    const gameTitleInput = document.getElementById("game-title");
    const gameUrlInput = document.getElementById("game-url");
    const gameCoverInput = document.getElementById("game-cover");
    
    const submitGameBtn = document.getElementById("submit-game-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    
    const saveGithubBtn = document.getElementById("save-github-btn");
    const reloadGithubBtn = document.getElementById("reload-github-btn");
    const downloadJsonBtn = document.getElementById("download-json-btn");

    let localGamesList = [];
    let fileSha = ""; // To store GitHub file SHA for updates
    let ghToken = "";

    // Show admin section if ?admin=true is present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("admin") === "true") {
        adminCard.classList.remove("hidden");
        // Load saved token if present
        const savedToken = localStorage.getItem("gh_token");
        if (savedToken) {
            tokenInput.value = savedToken;
            verifyGitHubToken(savedToken);
        }
    }

    // Toggle token password visibility
    toggleTokenBtn.addEventListener("click", () => {
        if (tokenInput.type === "password") {
            tokenInput.type = "text";
            toggleTokenBtn.innerText = "Hide";
        } else {
            tokenInput.type = "password";
            toggleTokenBtn.innerText = "Show";
        }
    });

    // Save token & Connect
    saveTokenBtn.addEventListener("click", () => {
        const token = tokenInput.value.trim();
        if (!token) {
            alert("Please enter a GitHub Token!");
            return;
        }
        verifyGitHubToken(token);
    });

    // Clear token & Disconnect
    clearTokenBtn.addEventListener("click", () => {
        localStorage.removeItem("gh_token");
        ghToken = "";
        tokenInput.value = "";
        tokenInput.disabled = false;
        saveTokenBtn.classList.remove("hidden");
        clearTokenBtn.classList.add("hidden");
        statusLight.className = "status-indicator red";
        statusText.innerText = "Disconnected from GitHub";
        cmsWorkspace.classList.add("hidden");
        localGamesList = [];
        fileSha = "";
    });

    // Verify Token by querying GitHub user endpoint
    async function verifyGitHubToken(token) {
        statusLight.className = "status-indicator red";
        statusText.innerText = "Connecting...";
        saveTokenBtn.disabled = true;

        try {
            const response = await fetch("https://api.github.com/user", {
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json"
                }
            });

            if (response.ok) {
                const userData = await response.json();
                localStorage.setItem("gh_token", token);
                ghToken = token;
                tokenInput.disabled = true;
                saveTokenBtn.classList.add("hidden");
                clearTokenBtn.classList.remove("hidden");
                
                statusLight.className = "status-indicator green";
                statusText.innerText = `Connected as @${userData.login}`;
                
                // Fetch catalog games.json from repository
                loadGamesFromGitHub();
            } else {
                throw new Error("Invalid GitHub Token or unauthorized access.");
            }
        } catch (e) {
            alert("Connection failed: " + e.message);
            statusText.innerText = "Connection failed. Invalid token.";
            statusLight.className = "status-indicator red";
            localStorage.removeItem("gh_token");
        } finally {
            saveTokenBtn.disabled = false;
        }
    }

    // Load games.json from GitHub
    async function loadGamesFromGitHub() {
        if (!ghToken) return;
        
        try {
            // Disable actions during loading
            saveGithubBtn.disabled = true;
            reloadGithubBtn.disabled = true;
            
            const response = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`, {
                headers: {
                    "Authorization": `token ${ghToken}`,
                    "Accept": "application/vnd.github.v3+json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                fileSha = data.sha;
                
                // Decode base64 content
                const rawJson = decodeBase64(data.content.replace(/\s/g, ''));
                localGamesList = JSON.parse(rawJson);
                
                // Render list
                renderGamesTable();
                
                // Show editor panel
                cmsWorkspace.classList.remove("hidden");
            } else if (response.status === 404) {
                // If games.json is not found, initialize empty
                localGamesList = [];
                fileSha = "";
                renderGamesTable();
                cmsWorkspace.classList.remove("hidden");
                alert("Note: games.json was not found in the repository. We will create a new one when you save.");
            } else {
                throw new Error("Failed to load games.json from GitHub.");
            }
        } catch (e) {
            alert("Error loading repository files: " + e.message);
        } finally {
            saveGithubBtn.disabled = false;
            reloadGithubBtn.disabled = false;
        }
    }

    // Render Games Table in CMS Workspace
    function renderGamesTable() {
        gamesTableBody.innerHTML = "";
        gamesCountSpan.innerText = localGamesList.length;

        if (localGamesList.length === 0) {
            gamesTableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">No games in library. Add your first game!</td></tr>`;
            return;
        }

        localGamesList.forEach((game, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(game.title)}</strong></td>
                <td class="actions-col">
                    <div class="action-btn-group">
                        <button class="btn btn-secondary edit-btn" data-index="${index}">Edit</button>
                        <button class="btn btn-danger delete-btn" data-index="${index}">Delete</button>
                    </div>
                </td>
            `;
            gamesTableBody.appendChild(tr);
        });

        // Add Event Listeners to Buttons
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                startEditGame(index);
            });
        });

        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                deleteGame(index);
            });
        });
    }

    // Add / Edit Game Submission
    gameForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const title = gameTitleInput.value.trim();
        const rawUrl = gameUrlInput.value.trim();
        const coverUrl = gameCoverInput.value.trim() || null;
        const editIndex = parseInt(editIndexInput.value);

        if (!title || !rawUrl) {
            alert("Please fill out all required fields!");
            return;
        }

        // Obfuscate ROM URL to Base64
        const downloadUrl = encodeBase64(rawUrl);

        const gameObject = {
            title,
            downloadUrl,
            coverUrl
        };

        if (editIndex >= 0) {
            // Update existing game
            localGamesList[editIndex] = gameObject;
            cancelEdit();
        } else {
            // Add new game
            localGamesList.push(gameObject);
            gameForm.reset();
        }

        renderGamesTable();
    });

    // Start Editing Game details
    function startEditGame(index) {
        const game = localGamesList[index];
        editIndexInput.value = index;
        
        gameTitleInput.value = game.title;
        gameCoverInput.value = game.coverUrl || game.coverFrontUrl || game.cover || game.image || "";
        
        // Decrypt Base64 back to raw URL for developer editing
        gameUrlInput.value = decodeBase64(game.downloadUrl);
        
        formTitle.innerText = "Edit Game Details";
        submitGameBtn.innerText = "Save Changes";
        cancelEditBtn.classList.remove("hidden");
        
        // Scroll to form on mobile
        gameForm.scrollIntoView({ behavior: "smooth" });
    }

    // Cancel edit state
    function cancelEdit() {
        editIndexInput.value = "-1";
        gameForm.reset();
        formTitle.innerText = "Add New Game";
        submitGameBtn.innerText = "Add Game";
        cancelEditBtn.classList.add("hidden");
    }

    cancelEditBtn.addEventListener("click", cancelEdit);

    // Delete game from local list
    function deleteGame(index) {
        const game = localGamesList[index];
        if (confirm(`Are you sure you want to delete "${game.title}"?`)) {
            // If we are currently editing this game, reset form
            if (parseInt(editIndexInput.value) === index) {
                cancelEdit();
            }
            localGamesList.splice(index, 1);
            renderGamesTable();
        }
    }

    // Save changes to GitHub
    saveGithubBtn.addEventListener("click", async () => {
        if (!ghToken) return;
        
        saveGithubBtn.disabled = true;
        saveGithubBtn.innerText = "Saving to GitHub...";
        
        try {
            const updatedJsonString = JSON.stringify(localGamesList, null, 2);
            const encodedContent = encodeBase64(updatedJsonString);
            
            const payload = {
                message: "Update games.json database via Web CMS panel",
                content: encodedContent,
                branch: GH_BRANCH
            };
            
            if (fileSha) {
                payload.sha = fileSha;
            }
            
            const response = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`, {
                method: "PUT",
                headers: {
                    "Authorization": `token ${ghToken}`,
                    "Content-Type": "application/json",
                    "Accept": "application/vnd.github.v3+json"
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const responseData = await response.json();
                fileSha = responseData.content.sha;
                alert("Successfully saved changes to GitHub! The live database updates instantly.");
                
                // Refresh the public preview gallery immediately
                renderPreviewGallery(localGamesList);
            } else {
                const errData = await response.json();
                throw new Error(errData.message || "Unknown error occurred.");
            }
        } catch (e) {
            alert("Failed to save changes to GitHub: " + e.message);
        } finally {
            saveGithubBtn.disabled = false;
            saveGithubBtn.innerText = "💾 Save Changes to GitHub";
        }
    });

    // Reload list from GitHub
    reloadGithubBtn.addEventListener("click", () => {
        if (confirm("Discard all local edits and reload from GitHub?")) {
            cancelEdit();
            loadGamesFromGitHub();
        }
    });

    // Download JSON backup
    downloadJsonBtn.addEventListener("click", () => {
        const jsonStr = JSON.stringify(localGamesList, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "games.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // HTML escape helper
    function escapeHtml(text) {
        if (!text) return "";
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
});

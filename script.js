const firebaseConfig = {
  apiKey: "AIzaSyADJ8X2y88Bw6ERym5TF0_YhpSPBREaZcE",
  authDomain: "diary-copy.firebaseapp.com",
  projectId: "diary-copy",
  storageBucket: "diary-copy.firebasestorage.app",
  messagingSenderId: "728214905373",
  appId: "1:728214905373:web:a29328daeae2239c105cf4",
  measurementId: "G-P2XRE17M7D"
};

const CLOUDINARY_CONFIG_PRIMARY = { cloudName: 'dc2p1idib', uploadPreset: 'diary_unsigned_preset' };
const CLOUDINARY_CONFIG_SECONDARY = { cloudName: 'dsra7wixr', uploadPreset: 'diary_unsigned_preset' };
const getCloudinaryConfig = () => auth.currentUser?.email === 'chinturoom01@gmail.com' ? CLOUDINARY_CONFIG_PRIMARY : CLOUDINARY_CONFIG_SECONDARY;

try { firebase.initializeApp(firebaseConfig); } catch (e) { console.error(e); }
const auth = firebase.auth(), db = firebase.firestore(), $ = id => document.getElementById(id);

// DOM Elements
const authScreen = $('auth-screen'), diaryApp = $('diary-app'), loginForm = $('login-form'), registerForm = $('register-form'), forgotForm = $('forgot-form'), loginError = $('login-error'), registerError = $('register-error'), forgotError = $('forgot-error'), forgotSuccess = $('forgot-success'), logoutBtn = $('logout-btn'), diaryTitle = $('diary-title'), dropdownUserName = $('dropdown-user-name'), prevYearBtn = $('prev-year'), prevMonthBtn = $('prev-month'), nextMonthBtn = $('next-month'), nextYearBtn = $('next-year'), currentMonthEl = $('current-month'), currentYearEl = $('current-year'), calendarGrid = $('calendar-grid'), calendarContainer = $('calendar-container'), entryDateEl = $('entry-date'), diaryContent = $('diary-content'), saveEntryBtn = $('save-entry'), cancelEditBtn = $('cancel-edit'), editEntryBtn = $('edit-entry'), editMode = $('edit-mode'), viewMode = $('view-mode'), diaryDisplay = $('diary-display'), notification = $('notification'), notificationMessage = $('notification-message'), togglePasswordBtn = $('toggle-password'), togglePasswordRegisterBtn = $('toggle-password-register'), loginPasswordInput = $('login-password'), registerPasswordInput = $('register-password'), editProfileBtn = $('edit-profile-btn'), editProfileModal = new bootstrap.Modal($('editProfileModal')), editNameInput = $('edit-name'), editEmailInput = $('edit-email'), saveProfileBtn = $('save-profile-btn'), editProfileError = $('edit-profile-error'), loginBtnText = $('login-btn-text'), loginSpinner = $('login-spinner'), registerBtnText = $('register-btn-text'), registerSpinner = $('register-spinner'), forgotBtnText = $('forgot-btn-text'), forgotSpinner = $('forgot-spinner'), swipeHint = $('swipe-hint'), photoGallerySection = $('photo-gallery-section'), addPhotosBtn = $('add-photos-btn'), photoInput = $('photo-input'), photoGallery = $('photo-gallery'), photoGalleryContainer = $('photo-gallery-container'), noPhotos = $('no-photos'), uploadProgress = $('upload-progress'), galleryPrev = $('gallery-prev'), galleryNext = $('gallery-next'), galleryDots = $('gallery-dots'), photoGalleryViewSection = $('photo-gallery-view-section'), photoGalleryView = $('photo-gallery-view'), photoGalleryViewContainer = $('photo-gallery-view-container'), galleryViewPrev = $('gallery-view-prev'), galleryViewNext = $('gallery-view-next'), galleryViewDots = $('gallery-view-dots'), photoLightbox = new bootstrap.Modal($('photoLightbox')), lightboxImage = $('lightbox-image'), deletePhotoBtn = $('delete-photo-btn'), lightboxPrev = $('lightbox-prev'), lightboxNext = $('lightbox-next'), searchToggleBtn = $('search-toggle-btn'), searchPanel = $('search-panel'), closeSearchBtn = $('close-search-btn'), searchInput = $('search-input'), searchBtn = $('search-btn'), searchFromDate = $('search-from-date'), searchToDate = $('search-to-date'), clearFiltersBtn = $('clear-filters-btn'), searchStats = $('search-stats'), resultsCount = $('results-count'), searchResults = $('search-results'), themeToggleBtn = $('theme-toggle-btn'), themeToggleAuth = $('theme-toggle-auth'), themeIcon = $('theme-icon'), draftStatusEl = $('draft-status'), draftStatusText = $('draft-status-text'), draftIcon = $('draft-icon'), draftRestoreBanner = $('draft-restore-banner'), draftTimeEl = $('draft-time'), restoreDraftBtn = $('restore-draft-btn'), discardDraftBtn = $('discard-draft-btn');

// State Variables
let currentDate = new Date(), selectedDate = null, diaryEntries = {}, diaryPhotos = {}, today = new Date(), isEditing = false, isNewEntry = false, currentPhotoIndex = 0, currentPhotos = [], autoScrollInterval = null, lightboxPhotoIndex = 0, isInEditMode = false, calendarTouchStartX = 0, calendarTouchStartY = 0, calendarTouchMoved = false, calendarSwipeDetected = false, draftAutoSaveTimeout = null;
today.setHours(0, 0, 0, 0);
const DRAFT_SAVE_DELAY = 3000;

// ==================== THEME ====================
const initTheme = () => setTheme(localStorage.getItem('diaryTheme') || 'light');
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('diaryTheme', theme);
    document.querySelectorAll('#theme-icon, .theme-toggle-auth i').forEach(icon => {
        icon.classList.toggle('bi-sun-fill', theme === 'dark');
        icon.classList.toggle('bi-moon-fill', theme !== 'dark');
    });
}
const toggleTheme = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
themeToggleBtn.addEventListener('click', toggleTheme);
themeToggleAuth.addEventListener('click', toggleTheme);
initTheme();

// ==================== DRAFTS ====================
const getDraftKey = date => auth.currentUser ? `diary_draft_${auth.currentUser.uid}_${date}` : null;
function saveDraft() {
    if (!selectedDate || !auth.currentUser) return;
    const content = diaryContent.value;
    if (!content.trim()) return clearDraft(selectedDate);
    const draftKey = getDraftKey(selectedDate);
    if (!draftKey) return;
    try {
        localStorage.setItem(draftKey, JSON.stringify({ content, savedAt: new Date().toISOString(), date: selectedDate }));
        updateDraftStatus('saved');
        renderCalendar();
    } catch (e) { console.warn('Draft save failed:', e); }
}
const loadDraft = date => { const s = localStorage.getItem(getDraftKey(date)); return s ? JSON.parse(s) : null; };
function clearDraft(date) { const k = getDraftKey(date); if (k) localStorage.removeItem(k); hideDraftStatus(); hideDraftBanner(); }
const getAllDraftDates = () => {
    if (!auth.currentUser) return [];
    const p = `diary_draft_${auth.currentUser.uid}_`, d = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(p)) d.push(k.substring(p.length)); }
    return d;
};
function updateDraftStatus(status) {
    draftStatusText.textContent = status === 'saved' ? `Draft auto-saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}` : 'Saving draft...';
    draftIcon.className = status === 'saved' ? 'bi bi-cloud-check' : 'bi bi-cloud-arrow-up';
    draftStatusEl.classList.remove('d-none', status === 'saved' ? 'draft-saving' : 'draft-saved');
    draftStatusEl.classList.add(status === 'saved' ? 'draft-saved' : 'draft-saving');
}
const hideDraftStatus = () => draftStatusEl?.classList.add('d-none');
function showDraftBanner(draft) {
    const diffMs = Date.now() - new Date(draft.savedAt).getTime(), diffMins = Math.floor(diffMs / 60000), diffHours = Math.floor(diffMins / 60), diffDays = Math.floor(diffHours / 24);
    draftTimeEl.textContent = diffMins < 1 ? 'just now' : diffMins < 60 ? `${diffMins} minute${diffMins === 1 ? '' : 's'} ago` : diffHours < 24 ? `${diffHours} hour${diffHours === 1 ? '' : 's'} ago` : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    draftRestoreBanner.classList.remove('d-none');
}
const hideDraftBanner = () => draftRestoreBanner?.classList.add('d-none');

diaryContent.addEventListener('input', () => {
    if (!selectedDate || !isInEditMode) return;
    clearTimeout(draftAutoSaveTimeout);
    updateDraftStatus('saving');
    draftAutoSaveTimeout = setTimeout(saveDraft, DRAFT_SAVE_DELAY);
});
window.addEventListener('beforeunload', () => { if (selectedDate && isInEditMode && diaryContent.value.trim()) { clearTimeout(draftAutoSaveTimeout); saveDraft(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && selectedDate && isInEditMode && diaryContent.value.trim()) { clearTimeout(draftAutoSaveTimeout); saveDraft(); } });

restoreDraftBtn.addEventListener('click', () => {
    const d = loadDraft(selectedDate);
    if (d) { diaryContent.value = d.content; hideDraftBanner(); showNotification('Draft restored!', 'success'); updateDraftStatus('saved'); }
});
discardDraftBtn.addEventListener('click', () => { clearDraft(selectedDate); hideDraftBanner(); if (isNewEntry) diaryContent.value = ''; renderCalendar(); showNotification('Draft discarded', 'warning'); });

// ==================== AUTH ====================
auth.onAuthStateChanged(user => {
    // Hide initial loader once firebase determines auth state
    const loader = $('initial-loader');
    if (loader) loader.style.display = 'none';
    
    if (user) checkUserVerification(user);
    else showAuthScreen();
});

function showAuthScreen() { authScreen.classList.remove('d-none'); diaryApp.classList.add('d-none'); $('login-tab').click(); }
function showDiaryApp(user) {
    authScreen.classList.add('d-none'); diaryApp.classList.remove('d-none');
    const name = user.displayName || user.email;
    diaryTitle.textContent = `${name}'s Diary`;
    dropdownUserName.textContent = name;
    renderCalendar(); hideSwipeHintAfterDelay();
}
async function checkUserVerification(user) {
    try {
        if (user.emailVerified) { 
            showDiaryApp(user); 
            await loadDiaryEntries(user.uid); // Wait for entries to load
            await loadDiaryPhotos(user.uid); 
            checkMemoryLaneAndEmail(); // Trigger the AI Memory Lane check!
        } else { 
            await auth.signOut(); 
            setAlert(loginError, "Please verify your email before logging in."); 
            showAuthScreen(); 
        }
    } catch (e) { 
        await auth.signOut(); 
        setAlert(loginError, "Authentication error."); 
        showAuthScreen(); 
    }
}
const hideSwipeHintAfterDelay = () => {
    if (!localStorage.getItem('swipeHintShown')) setTimeout(() => { swipeHint.classList.add('hidden'); localStorage.setItem('swipeHintShown', 'true'); }, 5000);
    else swipeHint.classList.add('hidden');
};

const setupToggle = (btn, input) => btn.addEventListener('click', () => { const t = input.getAttribute('type') === 'password' ? 'text' : 'password'; input.setAttribute('type', t); btn.querySelector('i').classList.toggle('bi-eye'); btn.querySelector('i').classList.toggle('bi-eye-slash'); });
setupToggle(togglePasswordBtn, loginPasswordInput);
setupToggle(togglePasswordRegisterBtn, registerPasswordInput);

const setAlert = (el, msg, type = 'danger') => { if (!el) return; if (msg) { el.textContent = msg; el.className = `alert alert-${type}`; } else el.classList.add('d-none'); };
const authErrors = { 'auth/user-not-found': "No account found with this email.", 'auth/wrong-password': "Incorrect password.", 'auth/invalid-email': "Invalid email address.", 'auth/user-disabled': "This account has been disabled.", 'auth/too-many-requests': "Too many attempts. Please try again later.", 'auth/email-already-in-use': "An account with this email already exists.", 'auth/weak-password': "Password is too weak." };
const getAuthErrorMessage = error => authErrors[error.code] || error.message;

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('login-email').value, password = $('login-password').value;
    if (!email || !password) return setAlert(loginError, "Please enter both email and password");
    try {
        loginBtnText.textContent = 'Logging in'; loginSpinner.classList.remove('d-none'); loginForm.querySelectorAll('input').forEach(el => el.disabled = true); setAlert(loginError);
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (!cred.user.emailVerified) { await auth.signOut(); throw new Error("Please verify your email before logging in."); }
    } catch (err) { setAlert(loginError, getAuthErrorMessage(err)); }
    finally { loginBtnText.textContent = 'Login'; loginSpinner.classList.add('d-none'); loginForm.querySelectorAll('input').forEach(el => el.disabled = false); }
});

registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('register-name').value, email = $('register-email').value, password = $('register-password').value;
    if (!name || !email || !password) return setAlert(registerError, "Please fill in all fields");
    if (password.length < 6) return setAlert(registerError, "Password must be at least 6 characters");
    try {
        registerBtnText.textContent = 'Creating Account'; registerSpinner.classList.remove('d-none'); registerForm.querySelectorAll('input').forEach(el => el.disabled = true); setAlert(registerError);
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name }); await cred.user.sendEmailVerification();
        await db.collection('users').doc(cred.user.uid).set({ name, email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await auth.signOut();
        setAlert(registerError, "Registration successful! Please check your email to verify.", "success");
        registerForm.reset();
        setTimeout(() => { $('login-tab').click(); setAlert(registerError); }, 3000);
    } catch (err) { setAlert(registerError, getAuthErrorMessage(err)); }
    finally { registerBtnText.textContent = 'Register'; registerSpinner.classList.add('d-none'); registerForm.querySelectorAll('input').forEach(el => el.disabled = false); }
});

forgotForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('forgot-email').value;
    if (!email) return setAlert(forgotError, "Please enter your email address");
    try {
        forgotBtnText.textContent = 'Sending...'; forgotSpinner.classList.remove('d-none'); forgotForm.querySelectorAll('input').forEach(el => el.disabled = true); setAlert(forgotError); setAlert(forgotSuccess);
        await auth.sendPasswordResetEmail(email);
        setAlert(forgotSuccess, "Password reset email sent! Check your inbox.", "success");
        forgotForm.reset();
        setTimeout(() => { $('login-tab').click(); setAlert(forgotSuccess); }, 6000);
    } catch (err) { setAlert(forgotError, getAuthErrorMessage(err)); }
    finally { forgotBtnText.textContent = 'Send Reset Link'; forgotSpinner.classList.add('d-none'); forgotForm.querySelectorAll('input').forEach(el => el.disabled = false); }
});

logoutBtn.addEventListener('click', async () => {
    try { if (selectedDate && isInEditMode && diaryContent.value.trim()) saveDraft(); await auth.signOut(); showNotification('Logged out successfully'); }
    catch (err) { showNotification(err.message, 'danger'); }
});

editProfileBtn.addEventListener('click', () => { const u = auth.currentUser; if (u) { editNameInput.value = u.displayName || ''; editEmailInput.value = u.email || ''; editProfileModal.show(); } });
saveProfileBtn.addEventListener('click', async () => {
    const u = auth.currentUser; if (!u) return;
    const newName = editNameInput.value.trim();
    if (!newName) return setAlert(editProfileError, "Name cannot be empty");
    try {
        saveProfileBtn.disabled = true; saveProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...'; setAlert(editProfileError);
        await u.updateProfile({ displayName: newName }); await db.collection('users').doc(u.uid).update({ name: newName });
        diaryTitle.textContent = `${newName}'s Diary`; dropdownUserName.textContent = newName; editProfileModal.hide(); showNotification('Profile updated successfully!');
    } catch (err) { setAlert(editProfileError, err.message); }
    finally { saveProfileBtn.disabled = false; saveProfileBtn.innerHTML = 'Save Changes'; }
});

// ==================== CALENDAR ====================
prevMonthBtn.addEventListener('click', () => navigateMonth(-1)); nextMonthBtn.addEventListener('click', () => navigateMonth(1)); prevYearBtn.addEventListener('click', () => navigateYear(-1)); nextYearBtn.addEventListener('click', () => navigateYear(1));
function navigateMonth(d) { const a = d > 0 ? 'slide-left' : 'slide-right'; calendarGrid.classList.add(a); setTimeout(() => { currentDate.setMonth(currentDate.getMonth() + d); renderCalendar(); calendarGrid.classList.remove(a); }, 150); }
function navigateYear(d) { const a = d > 0 ? 'slide-left' : 'slide-right'; calendarGrid.classList.add(a); setTimeout(() => { currentDate.setFullYear(currentDate.getFullYear() + d); renderCalendar(); calendarGrid.classList.remove(a); }, 150); }

calendarContainer.addEventListener('touchstart', e => { calendarTouchStartX = e.changedTouches[0].screenX; calendarTouchStartY = e.changedTouches[0].screenY; calendarTouchMoved = false; calendarSwipeDetected = false; }, { passive: true });
calendarContainer.addEventListener('touchmove', e => { const dx = Math.abs(e.changedTouches[0].screenX - calendarTouchStartX), dy = Math.abs(e.changedTouches[0].screenY - calendarTouchStartY); if (dx > 20 && dx > dy) { calendarTouchMoved = true; calendarSwipeDetected = true; } }, { passive: true });
calendarContainer.addEventListener('touchend', e => {
    if (calendarTouchMoved && calendarSwipeDetected) { const diffX = calendarTouchStartX - e.changedTouches[0].screenX; if (Math.abs(diffX) > 50) { navigateMonth(diffX > 0 ? 1 : -1); swipeHint.classList.add('hidden'); localStorage.setItem('swipeHintShown', 'true'); } }
    calendarTouchMoved = false; calendarSwipeDetected = false;
}, { passive: true });

function renderCalendar() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long' }); currentYearEl.textContent = year;
    calendarGrid.innerHTML = '<div style="display:contents">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div style="font-weight:bold;text-align:center;font-size:0.75rem;color:var(--text-muted)">${d}</div>`).join('') + '</div>';
    const draftDates = getAllDraftDates(), firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) calendarGrid.appendChild(document.createElement('div'));
    for (let day = 1; day <= daysInMonth; day++) {
        const el = document.createElement('div'); el.classList.add('calendar-day'); el.textContent = day;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month, day); dateObj.setHours(0, 0, 0, 0);
        if (dateObj.getTime() === today.getTime()) el.classList.add('today');
        const hasEntry = !!diaryEntries[dateStr];
        if (hasEntry) el.classList.add('has-entry');
        if (diaryPhotos[dateStr]?.length > 0) el.classList.add('has-photos');
        if (!hasEntry && draftDates.includes(dateStr)) el.classList.add('has-draft');
        if (selectedDate === dateStr) el.classList.add('selected');
        if (dateObj > today) el.classList.add('disabled');
        else el.addEventListener('click', () => selectDate(year, month, day));
        calendarGrid.appendChild(el);
    }
}

function selectDate(year, month, day) {
    if (selectedDate && isInEditMode && diaryContent.value.trim()) { clearTimeout(draftAutoSaveTimeout); saveDraft(); }
    selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day); dateObj.setHours(0, 0, 0, 0);
    if (dateObj > today) return showNotification('You cannot add entries for future dates', 'warning');
    entryDateEl.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    isEditing = false; stopAutoScroll(); searchPanel.classList.add('d-none'); hideDraftStatus(); hideDraftBanner();
    currentPhotos = diaryPhotos[selectedDate] || []; currentPhotoIndex = 0;

    if (diaryEntries[selectedDate]) {
        isNewEntry = false; const entry = diaryEntries[selectedDate];
        const timeDisplay = entry.updatedTime && entry.savedTime !== entry.updatedTime ? `Saved at: ${entry.savedTime} | Updated at: ${entry.updatedTime}` : `Saved at: ${entry.savedTime}`;
        diaryDisplay.innerHTML = `<div class="entry-content-wrapper">${entry.content}</div><div class="entry-time">${timeDisplay}</div>`;
        editMode.classList.add('d-none'); viewMode.classList.remove('d-none'); photoGallerySection.classList.add('d-none'); isInEditMode = false;
        if (currentPhotos.length > 0) { photoGalleryViewSection.classList.remove('d-none'); renderGallery('view'); } else photoGalleryViewSection.classList.add('d-none');
    } else {
        isNewEntry = true; const draft = loadDraft(selectedDate);
        if (draft) { diaryContent.value = draft.content; showDraftBanner(draft); updateDraftStatus('saved'); } else diaryContent.value = '';
        editMode.classList.remove('d-none'); viewMode.classList.add('d-none'); photoGallerySection.classList.remove('d-none'); isInEditMode = true; photoGalleryViewSection.classList.add('d-none');
        renderGallery('edit'); saveEntryBtn.textContent = 'Save Entry'; cancelEditBtn.classList.add('d-none');
    }
    saveEntryBtn.disabled = false; renderCalendar();
}

// ==================== SEARCH ====================
searchToggleBtn.addEventListener('click', () => { searchPanel.classList.toggle('d-none'); if (!searchPanel.classList.contains('d-none')) searchInput.focus(); });
closeSearchBtn.addEventListener('click', () => searchPanel.classList.add('d-none'));
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });
let searchTimeout;
searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { if (searchInput.value.trim().length >= 2) performSearch(); else if (searchInput.value.trim().length === 0) resetSearchResults(); }, 300); });
searchFromDate.addEventListener('change', performSearch); searchToDate.addEventListener('change', performSearch);
clearFiltersBtn.addEventListener('click', () => { searchInput.value = ''; searchFromDate.value = ''; searchToDate.value = ''; resetSearchResults(); });

function performSearch() {
    const query = searchInput.value.trim().toLowerCase(), fromDate = searchFromDate.value, toDate = searchToDate.value;
    searchResults.innerHTML = '<div class="search-loading"><div class="spinner-border" role="status"></div><p class="mt-2">Searching...</p></div>';
    searchStats.classList.add('d-none');
    setTimeout(() => {
        const results = [];
        for (const [date, entry] of Object.entries(diaryEntries)) {
            if (fromDate && date < fromDate) continue; if (toDate && date > toDate) continue;
            if (query.length === 0 || entry.content.toLowerCase().includes(query))
                results.push({ date, content: entry.content, savedTime: entry.savedTime, updatedTime: entry.updatedTime, photoCount: diaryPhotos[date]?.length || 0, query });
        }
        results.sort((a, b) => b.date.localeCompare(a.date)); displaySearchResults(results, query);
    }, 200);
}

function displaySearchResults(results, query) {
    searchResults.innerHTML = '';
    if (results.length === 0) { searchStats.classList.add('d-none'); searchResults.innerHTML = `<div class="no-search-results"><i class="bi bi-search"></i><p>No entries found${query ? ` for "${query}"` : ''}</p></div>`; return; }
    searchStats.classList.remove('d-none'); resultsCount.textContent = `${results.length} result${results.length === 1 ? '' : 's'} found`;
    results.forEach(r => {
        const item = document.createElement('div'); item.className = 'search-result-item';
        const d = new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        let display = r.content; const max = 200;
        if (query) {
            const idx = r.content.toLowerCase().indexOf(query.toLowerCase());
            if (idx > 50) display = '...' + highlightText(r.content.substring(Math.max(0, idx - 50), Math.max(0, idx - 50) + max), query) + '...';
            else { display = highlightText(r.content.substring(0, max), query); if (r.content.length > max) display += '...'; }
        } else if (r.content.length > max) display = r.content.substring(0, max) + '...';
        item.innerHTML = `<div class="search-result-header"><span class="search-result-date">${d}</span><span class="search-result-time">${r.savedTime || ''}</span></div><div class="search-result-content">${display}</div><div class="search-result-meta">${r.photoCount > 0 ? `<span><i class="bi bi-images"></i> ${r.photoCount} photo${r.photoCount === 1 ? '' : 's'}</span>` : ''}${r.updatedTime ? `<span><i class="bi bi-pencil"></i> Updated</span>` : ''}</div>`;
        item.addEventListener('click', () => { const [y, m, dy] = r.date.split('-').map(Number); currentDate = new Date(y, m - 1, 1); renderCalendar(); selectDate(y, m - 1, dy); searchPanel.classList.add('d-none'); });
        searchResults.appendChild(item);
    });
}
const highlightText = (text, query) => !query ? text : text.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>');
const resetSearchResults = () => { searchStats.classList.add('d-none'); searchResults.innerHTML = '<div class="no-search-results"><i class="bi bi-journal-text"></i><p>Enter a keyword to search your diary entries</p></div>'; };

// ==================== GALLERY & LIGHTBOX ====================
function renderGallery(mode) {
    const isEdit = mode === 'edit';
    const container = isEdit ? photoGallery : photoGalleryView, dots = isEdit ? galleryDots : galleryViewDots, wrapper = isEdit ? photoGalleryContainer : photoGalleryViewContainer, prev = isEdit ? galleryPrev : galleryViewPrev, next = isEdit ? galleryNext : galleryViewNext;
    container.innerHTML = ''; dots.innerHTML = '';
    if (currentPhotos.length === 0) { if (isEdit) { noPhotos.classList.remove('d-none'); wrapper.classList.add('d-none'); } else photoGalleryViewSection.classList.add('d-none'); return; }
    if (isEdit) { noPhotos.classList.add('d-none'); wrapper.classList.remove('d-none'); } else photoGalleryViewSection.classList.remove('d-none');
    updatePhotoCount(wrapper);
    currentPhotos.forEach((photo, index) => {
        const div = document.createElement('div'); div.className = 'photo-item';
        const img = document.createElement('img'); img.src = photo.url; img.alt = `Photo ${index + 1}`; img.addEventListener('click', () => openLightbox(index));
        div.appendChild(img); container.appendChild(div);
        const dot = document.createElement('div'); dot.className = `gallery-dot ${index === currentPhotoIndex ? 'active' : ''}`; dot.addEventListener('click', () => goToPhoto(index, mode));
        dots.appendChild(dot);
    });
    if (currentPhotos.length > 1) { prev.classList.remove('d-none'); next.classList.remove('d-none'); renderThumbnailStrip(wrapper, mode); startAutoScroll(mode); }
    else { prev.classList.add('d-none'); next.classList.add('d-none'); }
    updateGalleryPosition(mode);
}
function updatePhotoCount(container) { const ex = container.querySelector('.photo-count'); if (ex) ex.remove(); const b = document.createElement('div'); b.className = 'photo-count'; b.textContent = `${currentPhotoIndex + 1} / ${currentPhotos.length}`; container.appendChild(b); }
function renderThumbnailStrip(container, mode) { const ex = container.querySelector('.thumbnail-strip'); if (ex) ex.remove(); const strip = document.createElement('div'); strip.className = 'thumbnail-strip'; currentPhotos.forEach((p, i) => { const t = document.createElement('img'); t.src = p.url; t.className = `thumbnail ${i === currentPhotoIndex ? 'active' : ''}`; t.addEventListener('click', () => goToPhoto(i, mode)); strip.appendChild(t); }); container.appendChild(strip); }
function updateGalleryPosition(mode) { const g = mode === 'edit' ? photoGallery : photoGalleryView, d = mode === 'edit' ? galleryDots : galleryViewDots, c = mode === 'edit' ? photoGalleryContainer : photoGalleryViewContainer; g.style.transform = `translateX(-${currentPhotoIndex * 100}%)`; d.querySelectorAll('.gallery-dot').forEach((dot, i) => dot.classList.toggle('active', i === currentPhotoIndex)); c.querySelectorAll('.thumbnail').forEach((thumb, i) => thumb.classList.toggle('active', i === currentPhotoIndex)); updatePhotoCount(c); }
const goToPhoto = (i, m) => { currentPhotoIndex = i; updateGalleryPosition(m); if (currentPhotos.length > 1) { stopAutoScroll(); startAutoScroll(m); } };
const nextPhoto = m => { currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length; updateGalleryPosition(m); };
const prevPhoto = m => { currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length; updateGalleryPosition(m); };
const startAutoScroll = m => { if (autoScrollInterval) clearInterval(autoScrollInterval); autoScrollInterval = setInterval(() => nextPhoto(m), 4000); };
const stopAutoScroll = () => { if (autoScrollInterval) { clearInterval(autoScrollInterval); autoScrollInterval = null; } };

galleryPrev.addEventListener('click', () => { prevPhoto('edit'); stopAutoScroll(); startAutoScroll('edit'); });
galleryNext.addEventListener('click', () => { nextPhoto('edit'); stopAutoScroll(); startAutoScroll('edit'); });
galleryViewPrev.addEventListener('click', () => { prevPhoto('view'); stopAutoScroll(); startAutoScroll('view'); });
galleryViewNext.addEventListener('click', () => { nextPhoto('view'); stopAutoScroll(); startAutoScroll('view'); });
photoGalleryContainer.addEventListener('mouseenter', stopAutoScroll); photoGalleryContainer.addEventListener('mouseleave', () => { if (currentPhotos.length > 1 && isInEditMode) startAutoScroll('edit'); });
photoGalleryViewContainer.addEventListener('mouseenter', stopAutoScroll); photoGalleryViewContainer.addEventListener('mouseleave', () => { if (currentPhotos.length > 1 && !isInEditMode) startAutoScroll('view'); });

const addSwipe = (c, m) => { let x = 0, mv = false; c.addEventListener('touchstart', e => { x = e.changedTouches[0].screenX; mv = false; stopAutoScroll(); }, { passive: true }); c.addEventListener('touchmove', e => { if (Math.abs(e.changedTouches[0].screenX - x) > 20) mv = true; }, { passive: true }); c.addEventListener('touchend', e => { if (mv && Math.abs(x - e.changedTouches[0].screenX) > 50) (x - e.changedTouches[0].screenX > 0) ? nextPhoto(m) : prevPhoto(m); if (currentPhotos.length > 1) startAutoScroll(m); }, { passive: true }); };
addSwipe(photoGalleryContainer, 'edit'); addSwipe(photoGalleryViewContainer, 'view');

const openLightbox = i => { lightboxPhotoIndex = i; updateLightboxImage(); deletePhotoBtn.classList.toggle('d-none', !isInEditMode); photoLightbox.show(); };
const updateLightboxImage = () => { lightboxImage.src = currentPhotos[lightboxPhotoIndex].url; lightboxPrev.style.display = lightboxNext.style.display = currentPhotos.length > 1 ? 'flex' : 'none'; };
lightboxPrev.addEventListener('click', () => { lightboxPhotoIndex = (lightboxPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length; updateLightboxImage(); });
lightboxNext.addEventListener('click', () => { lightboxPhotoIndex = (lightboxPhotoIndex + 1) % currentPhotos.length; updateLightboxImage(); });
document.addEventListener('keydown', e => { if (!$('photoLightbox').classList.contains('show')) return; if (e.key === 'ArrowLeft') { lightboxPhotoIndex = (lightboxPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length; updateLightboxImage(); } else if (e.key === 'ArrowRight') { lightboxPhotoIndex = (lightboxPhotoIndex + 1) % currentPhotos.length; updateLightboxImage(); } });

deletePhotoBtn.addEventListener('click', async () => {
    if (!selectedDate || !auth.currentUser || !confirm('Delete this photo?')) return;
    const p = currentPhotos[lightboxPhotoIndex], cfg = getCloudinaryConfig();
    try {
        deletePhotoBtn.disabled = true; deletePhotoBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        if (p.deleteToken) { try { const fd = new FormData(); fd.append('token', p.deleteToken); await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/delete_by_token`, { method: 'POST', body: fd }); } catch (e) {} }
        await db.collection('diaryPhotos').doc(`${auth.currentUser.uid}_${selectedDate}`).update({ photos: firebase.firestore.FieldValue.arrayRemove(p) });
        currentPhotos.splice(lightboxPhotoIndex, 1); diaryPhotos[selectedDate] = currentPhotos; photoLightbox.hide();
        if (currentPhotos.length > 0) { currentPhotoIndex = Math.min(currentPhotoIndex, currentPhotos.length - 1); renderGallery('edit'); } else { noPhotos.classList.remove('d-none'); photoGalleryContainer.classList.add('d-none'); }
        renderCalendar(); showNotification('Photo deleted!');
    } catch (e) { showNotification('Failed to delete', 'danger'); }
    finally { deletePhotoBtn.disabled = false; deletePhotoBtn.innerHTML = '<i class="bi bi-trash"></i> Delete'; }
});

// ==================== UPLOADS ====================
addPhotosBtn.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', async e => {
    const files = Array.from(e.target.files); if (!files.length || !selectedDate) return;
    if (files.some(f => !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type))) return showNotification('Only image files allowed', 'warning');
    if (files.some(f => f.size > 10 * 1024 * 1024)) return showNotification('Max 10MB per image', 'warning');
    await uploadPhotos(files); photoInput.value = '';
});

async function uploadPhotos(files) {
    uploadProgress.classList.remove('d-none');
    const pBar = uploadProgress.querySelector('.progress-bar'), stat = uploadProgress.querySelector('.upload-status');
    const uploaded = [], total = files.length;
    for (let i = 0; i < total; i++) {
        const f = files[i], start = Date.now(), sizeMB = (f.size / 1048576).toFixed(2);
        stat.innerHTML = `Uploading ${i + 1}/${total}: <strong>${f.name}</strong> (${sizeMB} MB)<div class="upload-stats"><span id="t"><i class="bi bi-clock"></i> 0.0s</span><span id="p"><i class="bi bi-cloud-upload"></i> 0 MB / ${sizeMB} MB</span><span id="s"><i class="bi bi-speedometer2"></i> 0 KB/s</span></div>`;
        pBar.style.width = `${(i / total) * 100}%`;
        const t = setInterval(() => {
            const el = (Date.now() - start) / 1000, est = Math.min((el / (el + 2)) * f.size, f.size), estMB = (est / 1048576).toFixed(2), sp = el > 0 ? (est / 1024 / el).toFixed(1) : 0;
            $('t').innerHTML = `<i class="bi bi-clock"></i> ${el.toFixed(1)}s`; $('p').innerHTML = `<i class="bi bi-cloud-upload"></i> ${estMB} MB / ${sizeMB} MB`; $('s').innerHTML = `<i class="bi bi-speedometer2"></i> ${sp} KB/s`;
        }, 100);
        try {
            const d = await uploadToCloudinary(f); clearInterval(t);
            const el = ((Date.now() - start) / 1000).toFixed(1), sp = ((f.size / 1024) / el).toFixed(1);
            stat.innerHTML = `✓ Uploaded ${i + 1}/${total}: <strong>${f.name}</strong><div class="upload-stats"><span><i class="bi bi-check-circle-fill text-success"></i> ${sizeMB} MB in ${el}s</span><span><i class="bi bi-speedometer2"></i> Avg: ${sp} KB/s</span></div>`;
            pBar.style.width = `${((i + 1) / total) * 100}%`; uploaded.push(d); await savePhotoToFirestore(d);
            if (!diaryPhotos[selectedDate]) diaryPhotos[selectedDate] = [];
            diaryPhotos[selectedDate].push(d); currentPhotos = diaryPhotos[selectedDate];
            renderGallery('edit'); renderCalendar(); await new Promise(r => setTimeout(r, 800));
        } catch (e) {
            clearInterval(t); stat.innerHTML = `✗ Failed: <strong>${f.name}</strong><div class="upload-stats"><span class="text-danger"><i class="bi bi-exclamation-circle-fill"></i> ${e.message}</span></div>`;
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    if (uploaded.length > 0) {
        const tot = (files.reduce((s, f) => s + f.size, 0) / 1048576).toFixed(2);
        stat.innerHTML = `<strong>✓ All done!</strong> ${uploaded.length}/${total} photo(s) uploaded<div class="upload-stats"><span><i class="bi bi-cloud-check-fill text-success"></i> Total: ${tot} MB</span></div>`;
        pBar.style.width = '100%'; await new Promise(r => setTimeout(r, 1500)); showNotification(`${uploaded.length} photo(s) uploaded!`);
    } else { stat.innerHTML = `<strong>✗ Upload failed</strong> - No photos were uploaded`; await new Promise(r => setTimeout(r, 2000)); }
    uploadProgress.classList.add('d-none'); pBar.style.width = '0%';
}

async function uploadToCloudinary(file) {
    const cfg = getCloudinaryConfig(); const fd = new FormData();
    fd.append('file', file); fd.append('upload_preset', cfg.uploadPreset); fd.append('folder', `diary_images/${auth.currentUser.uid}`);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || 'Upload failed');
    const d = await res.json();
    return { url: d.secure_url || null, publicId: d.public_id || null, deleteToken: d.delete_token || null, width: d.width || null, height: d.height || null, uploadedAt: new Date().toISOString() };
}

async function savePhotoToFirestore(photo) {
    if (!selectedDate || !auth.currentUser) return;
    const ref = db.collection('diaryPhotos').doc(`${auth.currentUser.uid}_${selectedDate}`);
    if ((await ref.get()).exists) await ref.update({ photos: firebase.firestore.FieldValue.arrayUnion(photo), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    else await ref.set({ userId: auth.currentUser.uid, date: selectedDate, photos: [photo], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}
const loadDiaryPhotos = async uid => { try { const s = await db.collection('diaryPhotos').where('userId', '==', uid).get(); diaryPhotos = {}; s.forEach(d => diaryPhotos[d.data().date] = d.data().photos || []); renderCalendar(); } catch (e) {} };

// ==================== ENTRIES ====================
saveEntryBtn.addEventListener('click', async () => {
    if (!selectedDate || !auth.currentUser) return;
    const content = diaryContent.value.trim(); if (!content) return showNotification('Please write something', 'warning');
    try {
        saveEntryBtn.disabled = true; saveEntryBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
        const ref = db.collection('diaryEntries').doc(`${auth.currentUser.uid}_${selectedDate}`);
        const tStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        if (isEditing) { await ref.update({ content, updatedTime: tStr, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); diaryEntries[selectedDate].content = content; diaryEntries[selectedDate].updatedTime = tStr; }
        else { await ref.set({ userId: auth.currentUser.uid, date: selectedDate, content, savedTime: tStr, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); diaryEntries[selectedDate] = { content, savedTime: tStr }; }
        clearDraft(selectedDate); renderCalendar();
        const entry = diaryEntries[selectedDate], tDisp = entry.updatedTime && entry.savedTime !== entry.updatedTime ? `Saved at: ${entry.savedTime} | Updated at: ${entry.updatedTime}` : `Saved at: ${entry.savedTime}`;
        diaryDisplay.innerHTML = `<div class="entry-content-wrapper">${content}</div><div class="entry-time">${tDisp}</div>`;
        editMode.classList.add('d-none'); viewMode.classList.remove('d-none'); photoGallerySection.classList.add('d-none'); isInEditMode = false;
        if (currentPhotos.length > 0) { photoGalleryViewSection.classList.remove('d-none'); renderGallery('view'); } else photoGalleryViewSection.classList.add('d-none');
        showNotification('Entry saved!');
    } catch (e) { showNotification(e.message, 'danger'); }
    finally { saveEntryBtn.disabled = false; saveEntryBtn.innerHTML = isEditing ? 'Update Entry' : 'Save Entry'; }
});

editEntryBtn.addEventListener('click', () => {
    const ex = diaryDisplay.querySelector('.entry-content-wrapper').textContent, d = loadDraft(selectedDate);
    diaryContent.value = ex;
    if (d && d.content.trim() !== ex.trim()) showDraftBanner(d); else hideDraftBanner();
    editMode.classList.remove('d-none'); viewMode.classList.add('d-none'); photoGallerySection.classList.remove('d-none'); isInEditMode = true; photoGalleryViewSection.classList.add('d-none');
    renderGallery('edit'); saveEntryBtn.textContent = 'Update Entry'; cancelEditBtn.classList.remove('d-none'); isEditing = true;
});

cancelEditBtn.addEventListener('click', () => {
    hideDraftBanner(); hideDraftStatus(); editMode.classList.add('d-none'); viewMode.classList.remove('d-none'); photoGallerySection.classList.add('d-none'); isInEditMode = false;
    if (currentPhotos.length > 0) { photoGalleryViewSection.classList.remove('d-none'); renderGallery('view'); } else photoGalleryViewSection.classList.add('d-none');
    isEditing = false;
});
const loadDiaryEntries = async uid => { try { const s = await db.collection('diaryEntries').where('userId', '==', uid).get(); diaryEntries = {}; s.forEach(d => { const data = d.data(); diaryEntries[data.date] = { content: data.content, savedTime: data.savedTime || '', updatedTime: data.updatedTime }; }); renderCalendar(); } catch (e) { showNotification(e.message, 'danger'); } };

// ==================== NOTIFICATIONS ====================
function showNotification(msg, type = 'success') {
    notificationMessage.textContent = msg;
    notification.className = `toast align-items-center text-white bg-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'success'}`;
    const pb = notification.querySelector('.progress-bar'); pb.style.animation = 'none'; pb.offsetHeight; pb.style.animation = null;
    new bootstrap.Toast(notification, { delay: 2000 }).show();
}
console.log("Diary app initialized with auto-save draft");







// ==================== AI MEMORY LANE (GEMINI + EMAILJS) ====================
// Initialize EmailJS
(function() {
    emailjs.init({ publicKey: "_HnmgWpPNr65nEYAM" });
    console.log("✅ EmailJS Initialized");
})();






async function summarizeTenglishDiary(text) {
    const apiKey = "--------------------------------"; // IMPORTANT: Please revoke the exposed key and use a new one!
    
// ❌ Old deprecated URL
// const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

// ✅ New active URL
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`;
    const prompt = `You are an AI assistant. Read the following diary entry written in a mix of Telugu and English (Tenglish). Summarize what the person did that day in 3-4 short, clear English sentences. Only output the summary. Diary entry: "${text}"`;

    let waitTime = 2000; // Start with a 2-second delay

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`🤖 Sending text to Gemini AI (Attempt ${attempt}/3)...`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-goog-api-key': apiKey 
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            // Check if the server returned a 503 or 500 before trying to parse JSON
            if (res.status === 503 || res.status === 500) {
                console.warn(`⏳ Google is busy (${res.status}). Waiting ${waitTime/1000}s before retrying...`);
                await new Promise(r => setTimeout(r, waitTime));
                waitTime *= 2; // Double the wait time for the next attempt
                continue; 
            }

            const data = await res.json();
            
            if (res.ok && data.candidates && data.candidates.length > 0) {
                const summary = data.candidates[0].content.parts[0].text.trim();
                console.log("✅ AI Summary received:", summary);
                return summary; // Success! Return the text
            } else if (data.error && data.error.message.includes("high demand")) {
                console.warn(`⏳ High demand detected. Waiting ${waitTime/1000}s before retrying...`);
                await new Promise(r => setTimeout(r, waitTime));
                waitTime *= 2; 
            } else {
                console.error("❌ Gemini response error:", data.error?.message || data);
                return null; // A different, non-recoverable error occurred
            }
        } catch (e) {
            console.error(`❌ Fetch Error on attempt ${attempt}:`, e);
            // If it's a network error, wait and try again
            await new Promise(r => setTimeout(r, waitTime));
            waitTime *= 2;
        }
    }
    console.error("❌ AI failed to respond after 3 attempts.");
    return null; 
}





// Main function to check dates, get AI summary, and send email
async function checkMemoryLaneAndEmail() {
    console.log("📅 Checking for Memory Lane entries...");
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date();
    const month = today.getMonth() + 1; 
    const day = today.getDate(); 
    const currentYear = today.getFullYear();

    const emailSentKey = `memEmailSent_${user.uid}_${currentYear}-${month}-${day}`;
    if (localStorage.getItem(emailSentKey)) {
        console.log("⏸️ Email already sent today, skipping.");
        return; 
    }

    let memoriesFound = [];

    for (const [dateStr, entry] of Object.entries(diaryEntries)) {
        const entryDate = new Date(dateStr + 'T00:00:00');
        if (entryDate.getMonth() + 1 === month && entryDate.getDate() === day && entryDate.getFullYear() < currentYear) {
            memoriesFound.push({
                yearsAgo: currentYear - entryDate.getFullYear(),
                date: dateStr,
                text: entry.content
            });
        }
    }

    if (memoriesFound.length > 0) {
        const memory = memoriesFound[0]; 
        console.log(`🎉 Found memory from ${memory.yearsAgo} year(s) ago! Date: ${memory.date}`);
        
        const formattedDate = new Date(memory.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        showNotification("🤖 AI is summarizing your past memory...", 'success');

        // 1. Get the AI summary
        const aiSummary = await summarizeTenglishDiary(memory.text);

        // 2. CHECK IF AI FAILED: If null, stop here. Do not send email.
        if (aiSummary === null) {
            console.log("⏸️ AI summary failed. Email NOT sent. Will try again later.");
            showNotification("⏸️ AI is busy right now. Memory email skipped.", 'warning');
            return; // Exit the function immediately
        }

        // 3. AI succeeded, proceed to send email
        const templateParams = {
            to_email: user.email, 
            entry_date: formattedDate,
            years_ago: memory.yearsAgo,
            ai_summary: aiSummary
        };

        try {
            console.log("📧 Attempting to send email via EmailJS with params:", templateParams);
            const response = await emailjs.send('service_izwp447', 'template_z3py3p5', templateParams);
            console.log("✅ EmailJS Send Success! Response:", response);
            console.log("📬 Memory Lane Email sent successfully to " + user.email);
            
            // Mark as sent ONLY if the email actually went through
            localStorage.setItem(emailSentKey, 'true');
            
            showNotification(`📧 Memory Lane Email sent for an entry from ${memory.yearsAgo} year(s) ago!`, 'success');
        } catch (error) {
            console.error("❌ Failed to send Memory Lane email via EmailJS:", error);
        }
    } else {
        console.log("🤷 No past memories found for today's date.");
    }
}
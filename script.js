// Firebase configuration - replace with your own config
 -- Your Firebase Configuration of Google
// Initialize Firebase with error handling
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
    showNotification("Firebase initialization failed. Check your configuration.", "danger");
}

const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const diaryApp = document.getElementById('diary-app');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotForm = document.getElementById('forgot-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const forgotError = document.getElementById('forgot-error');
const forgotSuccess = document.getElementById('forgot-success');
const logoutBtn = document.getElementById('logout-btn');
const diaryTitle = document.getElementById('diary-title');
const dropdownUserName = document.getElementById('dropdown-user-name');
const prevYearBtn = document.getElementById('prev-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const nextYearBtn = document.getElementById('next-year');
const currentMonthEl = document.getElementById('current-month');
const currentYearEl = document.getElementById('current-year');
const calendarGrid = document.getElementById('calendar-grid');
const entryDateEl = document.getElementById('entry-date');
const diaryContent = document.getElementById('diary-content');
const saveEntryBtn = document.getElementById('save-entry');
const cancelEditBtn = document.getElementById('cancel-edit');
const editEntryBtn = document.getElementById('edit-entry');
const editMode = document.getElementById('edit-mode');
const viewMode = document.getElementById('view-mode');
const diaryDisplay = document.getElementById('diary-display');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const togglePasswordBtn = document.getElementById('toggle-password');
const togglePasswordRegisterBtn = document.getElementById('toggle-password-register');
const loginPasswordInput = document.getElementById('login-password');
const registerPasswordInput = document.getElementById('register-password');
const editProfileBtn = document.getElementById('edit-profile-btn');
const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
const editProfileForm = document.getElementById('edit-profile-form');
const editNameInput = document.getElementById('edit-name');
const editEmailInput = document.getElementById('edit-email');
const saveProfileBtn = document.getElementById('save-profile-btn');
const editProfileError = document.getElementById('edit-profile-error');
const loginBtnText = document.getElementById('login-btn-text');
const loginSpinner = document.getElementById('login-spinner');
const registerBtnText = document.getElementById('register-btn-text');
const registerSpinner = document.getElementById('register-spinner');
const forgotBtnText = document.getElementById('forgot-btn-text');
const forgotSpinner = document.getElementById('forgot-spinner');

// Calendar state
let currentDate = new Date();
let selectedDate = null;
let diaryEntries = {};
let today = new Date();
today.setHours(0, 0, 0, 0); // Normalize to start of day
let isEditing = false;

// Check Firebase connection
console.log("Checking Firebase connection...");
auth.onAuthStateChanged(user => {
    console.log("Auth state changed. User:", user);
    if (user) {
        // Check if user is verified
        checkUserVerification(user);
    } else {
        showAuthScreen();
    }
});

// Show authentication screen
function showAuthScreen() {
    authScreen.classList.remove('d-none');
    diaryApp.classList.add('d-none');
    // Reset to login tab
    document.getElementById('login-tab').click();
}

// Show diary app
function showDiaryApp(user) {
    authScreen.classList.add('d-none');
    diaryApp.classList.remove('d-none');
    
    // Get display name or email
    const displayName = user.displayName || user.email;
    
    // Update diary title
    diaryTitle.textContent = `${displayName}'s Diary`;
    
    // Update dropdown username
    dropdownUserName.textContent = displayName;
    
    renderCalendar();
}

// Check if user is verified
async function checkUserVerification(user) {
    try {
        // Check if email is verified
        if (user.emailVerified) {
            // User is verified, show diary app
            showDiaryApp(user);
            loadDiaryEntries(user.uid);
        } else {
            // User is not verified, sign out and show auth screen
            await auth.signOut();
            showAuthError("login", "Please verify your email before logging in. If email not appear in inbox then check in Spam Mail!");
            showAuthScreen();
        }
    } catch (error) {
        console.error("Error checking user verification:", error);
        await auth.signOut();
        showAuthError("login", "Authentication error. Please try again.");
        showAuthScreen();
    }
}

// Toggle password visibility
togglePasswordBtn.addEventListener('click', function() {
    const type = loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    loginPasswordInput.setAttribute('type', type);
    
    // Toggle the eye icon
    this.querySelector('i').classList.toggle('bi-eye');
    this.querySelector('i').classList.toggle('bi-eye-slash');
});

// Toggle password visibility for register form
togglePasswordRegisterBtn.addEventListener('click', function() {
    const type = registerPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    registerPasswordInput.setAttribute('type', type);
    
    // Toggle the eye icon
    this.querySelector('i').classList.toggle('bi-eye');
    this.querySelector('i').classList.toggle('bi-eye-slash');
});

// Login form submission with enhanced error handling
loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    console.log("Attempting login with email:", email);
    
    if (!email || !password) {
        showAuthError("login", "Please enter both email and password");
        return;
    }
    
    try {
        // Show loading spinner
        loginBtnText.textContent = 'Logging in';
        loginSpinner.classList.remove('d-none');
        loginForm.querySelectorAll('input').forEach(el => el.disabled = true);
        hideAuthError("login");
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if email is verified
        if (!user.emailVerified) {
            // Sign out the user
            await auth.signOut();
            throw new Error("Please verify your email before logging in.");
        }
        
        console.log("Login successful:", user);
        // The rest is handled in onAuthStateChanged
    } catch (error) {
        console.error("Login error:", error.code, error.message);
        
        // Provide more user-friendly error messages
        let errorMessage = "";
        
        if (error.message === "Please verify your email before logging in. If email not appear in inbox then check in Spam Mail!") {
            errorMessage = error.message;
        } else {
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = "No account found with this email.";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "Incorrect password.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Invalid email address.";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "This account has been disabled.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Too many failed login attempts. Please try again later.";
                    break;
                default:
                    errorMessage = error.message;
            }
        }
        
        showAuthError("login", errorMessage);
    } finally {
        // Reset button state
        loginBtnText.textContent = 'Login';
        loginSpinner.classList.add('d-none');
        loginForm.querySelectorAll('input').forEach(el => el.disabled = false);
    }
});

// Register form submission with enhanced error handling
registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    console.log("Attempting registration with email:", email);
    
    if (!name || !email || !password) {
        showAuthError("register", "Please fill in all fields");
        return;
    }
    
    if (password.length < 6) {
        showAuthError("register", "Password must be at least 6 characters");
        return;
    }
    
    try {
        // Show loading spinner
        registerBtnText.textContent = 'Creating Account';
        registerSpinner.classList.remove('d-none');
        registerForm.querySelectorAll('input').forEach(el => el.disabled = true);
        hideAuthError("register");
        
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update user profile
        await userCredential.user.updateProfile({ displayName: name });
        
        // Send verification email
        await userCredential.user.sendEmailVerification();
        
        // Store user data in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Sign out the user
        await auth.signOut();
        
        // Show success message
        showAuthError("register", "Registration successful! Please check your email to verify your account.", "success");
        
        // Reset form
        registerForm.reset();
        
        // Switch to login tab after a delay
        setTimeout(() => {
            document.getElementById('login-tab').click();
            hideAuthError("register");
        }, 3000);
        
        console.log("Registration successful. Verification email sent to:", email);
    } catch (error) {
        console.error("Registration error:", error.code, error.message);
        
        // Provide more user-friendly error messages
        let errorMessage = "";
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "An account with this email already exists.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Invalid email address.";
                break;
            case 'auth/operation-not-allowed':
                errorMessage = "Email/password accounts are not enabled.";
                break;
            case 'auth/weak-password':
                errorMessage = "Password is too weak.";
                break;
            default:
                errorMessage = error.message;
        }
        
        showAuthError("register", errorMessage);
    } finally {
        // Reset button state
        registerBtnText.textContent = 'Register';
        registerSpinner.classList.add('d-none');
        registerForm.querySelectorAll('input').forEach(el => el.disabled = false);
    }
});

// Forgot password form submission
forgotForm.addEventListener('submit', async e => {
    e.preventDefault();
    
    const email = document.getElementById('forgot-email').value;
    
    if (!email) {
        showForgotError("Please enter your email address");
        return;
    }
    
    try {
        // Show loading spinner
        forgotBtnText.textContent = 'Sending...';
        forgotSpinner.classList.remove('d-none');
        forgotForm.querySelectorAll('input').forEach(el => el.disabled = true);
        hideForgotError();
        
        // Send password reset email
        await auth.sendPasswordResetEmail(email);
        
        // Show success message
        showForgotSuccess("Password reset email sent! Please check your inbox. If Mail not appear in inbox check in Spam Mail!");
        
        // Reset form
        forgotForm.reset();
        
        // Switch to login tab after a delay
        setTimeout(() => {
            document.getElementById('login-tab').click();
            hideForgotSuccess();
        }, 6000);
        
        console.log("Password reset email sent to:", email);
    } catch (error) {
        console.error("Forgot password error:", error.code, error.message);
        
        // Provide more user-friendly error messages
        let errorMessage = "";
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage = "No account found with this email.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Invalid email address.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Too many requests. Please try again later.";
                break;
            default:
                errorMessage = error.message;
        }
        
        showForgotError(errorMessage);
    } finally {
        // Reset button state
        forgotBtnText.textContent = 'Send Reset Link';
        forgotSpinner.classList.add('d-none');
        forgotForm.querySelectorAll('input').forEach(el => el.disabled = false);
    }
});

// Show authentication error in the form
function showAuthError(form, message, type = "danger") {
    if (form === "login") {
        loginError.textContent = message;
        loginError.className = `alert alert-${type}`;
        loginError.classList.remove('d-none');
    } else if (form === "register") {
        registerError.textContent = message;
        registerError.className = `alert alert-${type}`;
        registerError.classList.remove('d-none');
    }
}

// Hide authentication error
function hideAuthError(form) {
    if (form === "login") {
        loginError.classList.add('d-none');
    } else if (form === "register") {
        registerError.classList.add('d-none');
    }
}

// Show forgot password error
function showForgotError(message) {
    forgotError.textContent = message;
    forgotError.classList.remove('d-none');
}

// Hide forgot password error
function hideForgotError() {
    forgotError.classList.add('d-none');
}

// Show forgot password success
function showForgotSuccess(message) {
    forgotSuccess.textContent = message;
    forgotSuccess.classList.remove('d-none');
}

// Hide forgot password success
function hideForgotSuccess() {
    forgotSuccess.classList.add('d-none');
}

// Logout button
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        console.log("Logout successful");
        showNotification('Logged out successfully');
    } catch (error) {
        console.error("Logout error:", error);
        showNotification(error.message, 'danger');
    }
});

// Edit profile button
editProfileBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        // Populate the form with current user data
        editNameInput.value = user.displayName || '';
        editEmailInput.value = user.email || '';
        
        // Show the modal
        editProfileModal.show();
    }
});

// Save profile button
saveProfileBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const newName = editNameInput.value.trim();
    
    if (!newName) {
        showEditProfileError("Name cannot be empty");
        return;
    }
    
    try {
        // Disable button during submission
        saveProfileBtn.disabled = true;
        saveProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        hideEditProfileError();
        
        // Update user profile
        await user.updateProfile({ displayName: newName });
        
        // Update user document in Firestore
        await db.collection('users').doc(user.uid).update({
            name: newName
        });
        
        // Update UI
        diaryTitle.textContent = `${newName}'s Diary`;
        dropdownUserName.textContent = newName;
        
        // Close modal
        editProfileModal.hide();
        
        showNotification('Profile updated successfully!');
    } catch (error) {
        console.error("Update profile error:", error);
        showEditProfileError(error.message);
    } finally {
        // Re-enable button
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = 'Save Changes';
    }
});

// Show edit profile error
function showEditProfileError(message) {
    editProfileError.textContent = message;
    editProfileError.classList.remove('d-none');
}

// Hide edit profile error
function hideEditProfileError() {
    editProfileError.classList.add('d-none');
}

// Calendar navigation
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Year navigation
prevYearBtn.addEventListener('click', () => {
    currentDate.setFullYear(currentDate.getFullYear() - 1);
    renderCalendar();
});

nextYearBtn.addEventListener('click', () => {
    currentDate.setFullYear(currentDate.getFullYear() + 1);
    renderCalendar();
});

// Render calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Set month and year title
    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    currentYearEl.textContent = year;
    
    // Clear calendar grid
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.textContent = day;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.fontSize = '0.75rem';
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month, day);
        dateObj.setHours(0, 0, 0, 0); // Normalize to start of day
        
        // Check if this is today
        if (dateObj.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        }
        
        // Check if this date has an entry
        if (diaryEntries[dateStr]) {
            dayElement.classList.add('has-entry');
        }
        
        // Check if this is the selected date
        if (selectedDate === dateStr) {
            dayElement.classList.add('selected');
        }
        
        // Check if this date is in the future (after today)
        if (dateObj > today) {
            dayElement.classList.add('disabled');
        } else {
            // Add click event only for past or present dates
            dayElement.addEventListener('click', () => selectDate(year, month, day));
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

// Select a date
function selectDate(year, month, day) {
    selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const selectedDateObj = new Date(year, month, day);
    selectedDateObj.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Check if selected date is in the future
    if (selectedDateObj > today) {
        showNotification('You cannot add entries for future dates', 'warning');
        return;
    }
    
    entryDateEl.textContent = new Date(year, month, day).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Reset editing state
    isEditing = false;
    
    // Load entry content if it exists
    if (diaryEntries[selectedDate]) {
        // Show view mode
        const entry = diaryEntries[selectedDate];
        let timeDisplay = '';
        
        // Only show update time if the entry has been updated
        if (entry.updatedTime && entry.savedTime !== entry.updatedTime) {
            timeDisplay = `Saved at: ${entry.savedTime} | Updated at: ${entry.updatedTime}`;
        } else {
            timeDisplay = `Saved at: ${entry.savedTime}`;
        }
        
        diaryDisplay.innerHTML = `
            <div class="entry-content-wrapper">${entry.content}</div>
            <div class="entry-time">${timeDisplay}</div>
        `;
        editMode.classList.add('d-none');
        viewMode.classList.remove('d-none');
    } else {
        // Show edit mode for new entry
        diaryContent.value = '';
        editMode.classList.remove('d-none');
        viewMode.classList.add('d-none');
        saveEntryBtn.textContent = 'Save Entry';
        cancelEditBtn.classList.add('d-none');
    }
    
    // Enable save button only for dates up to today
    saveEntryBtn.disabled = false;
    
    // Re-render calendar to update selected date
    renderCalendar();
}

// Save diary entry
saveEntryBtn.addEventListener('click', async () => {
    if (!selectedDate || !auth.currentUser) return;
    
    // Double-check that the selected date is not in the future
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    if (selectedDateObj > today) {
        showNotification('You cannot save entries for future dates', 'warning');
        saveEntryBtn.disabled = true;
        return;
    }
    
    const content = diaryContent.value.trim();
    if (!content) {
        showNotification('Please write something before saving', 'warning');
        return;
    }
    
    try {
        saveEntryBtn.disabled = true;
        saveEntryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        const userId = auth.currentUser.uid;
        const entryRef = db.collection('diaryEntries').doc(`${userId}_${selectedDate}`);
        
        // Get current time with seconds and AM/PM
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        });
        
        if (isEditing) {
            // Update existing entry - update the updatedTime only
            await entryRef.update({
                content,
                updatedTime: timeString,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local diaryEntries
            diaryEntries[selectedDate].content = content;
            diaryEntries[selectedDate].updatedTime = timeString;
        } else {
            // Create new entry - only set savedTime, not updatedTime
            await entryRef.set({
                userId,
                date: selectedDate,
                content,
                savedTime: timeString,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local diaryEntries
            diaryEntries[selectedDate] = { 
                content, 
                savedTime: timeString
            };
        }
        
        renderCalendar();
        
        // Switch to view mode
        let timeDisplay = '';
        if (diaryEntries[selectedDate].updatedTime && 
            diaryEntries[selectedDate].savedTime !== diaryEntries[selectedDate].updatedTime) {
            timeDisplay = `Saved at: ${diaryEntries[selectedDate].savedTime} | Updated at: ${diaryEntries[selectedDate].updatedTime}`;
        } else {
            timeDisplay = `Saved at: ${diaryEntries[selectedDate].savedTime}`;
        }
        
        diaryDisplay.innerHTML = `
            <div class="entry-content-wrapper">${content}</div>
            <div class="entry-time">${timeDisplay}</div>
        `;
        editMode.classList.add('d-none');
        viewMode.classList.remove('d-none');
        
        showNotification('Entry saved successfully!');
    } catch (error) {
        console.error("Save entry error:", error);
        showNotification(error.message, 'danger');
    } finally {
        saveEntryBtn.disabled = false;
        saveEntryBtn.innerHTML = isEditing ? 'Update Entry' : 'Save Entry';
    }
});

// Edit entry button
editEntryBtn.addEventListener('click', () => {
    // Switch to edit mode
    const contentWrapper = diaryDisplay.querySelector('.entry-content-wrapper');
    diaryContent.value = contentWrapper.textContent;
    editMode.classList.remove('d-none');
    viewMode.classList.add('d-none');
    saveEntryBtn.textContent = 'Update Entry';
    cancelEditBtn.classList.remove('d-none');
    isEditing = true;
});

// Cancel edit button
cancelEditBtn.addEventListener('click', () => {
    // Switch back to view mode without saving
    editMode.classList.add('d-none');
    viewMode.classList.remove('d-none');
    isEditing = false;
});

// Load diary entries for the current user
async function loadDiaryEntries(userId) {
    try {
        console.log("Loading diary entries for user:", userId);
        
        const querySnapshot = await db.collection('diaryEntries')
            .where('userId', '==', userId)
            .get();
        
        diaryEntries = {};
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Only include updatedTime if it exists and is different from savedTime
            if (data.updatedTime && data.savedTime !== data.updatedTime) {
                diaryEntries[data.date] = { 
                    content: data.content,
                    savedTime: data.savedTime || '',
                    updatedTime: data.updatedTime
                };
            } else {
                diaryEntries[data.date] = { 
                    content: data.content,
                    savedTime: data.savedTime || ''
                };
            }
        });
        
        console.log("Loaded diary entries:", diaryEntries);
        renderCalendar();
    } catch (error) {
        console.error("Load diary entries error:", error);
        showNotification(error.message, 'danger');
    }
}

// Show notification with progress bar
function showNotification(message, type = 'success') {
    notificationMessage.textContent = message;
    
    // Set toast color based on type
    notification.className = `toast align-items-center text-white bg-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'success'}`;
    
    // Reset progress bar animation
    const progressBar = notification.querySelector('.progress-bar');
    progressBar.style.animation = 'none';
    // Trigger reflow
    progressBar.offsetHeight;
    progressBar.style.animation = null;
    
    // Show the toast
    const bsToast = new bootstrap.Toast(notification, { delay: 2000 });
    bsToast.show();
}

// Debugging function to check Firebase status
function checkFirebaseStatus() {
    console.log("Firebase App:", firebase.app());
    console.log("Auth:", auth);
    console.log("Firestore:", db);
    console.log("Current User:", auth.currentUser);
}

// Call this function to check Firebase status in the console
checkFirebaseStatus();

/* ==========================================================================
   Read'Em Auth Service (src/auth.js)
   Email/Password sign-in & sign-up with a teacher/student role layer.
   ========================================================================== */

// Simulated users store in localStorage
const getUsersFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('readem_mock_users') || '{}');
  } catch (e) {
    return {};
  }
};

const saveUsersToStorage = (users) => {
  localStorage.setItem('readem_mock_users', JSON.stringify(users));
};

let currentUser = null;
const listeners = new Set();

// Try to auto-restore session from localStorage
try {
  const savedUser = localStorage.getItem('readem_current_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
  }
} catch (e) {}

const notifyListeners = () => {
  listeners.forEach((callback) => callback(currentUser));
};

export const Auth = {
  /**
   * Create a new account and persist the chosen role to local storage.
   * @param {string} email
   * @param {string} password
   * @param {'teacher'|'student'} role
   * @param {string} displayName
   */
  async signUp(email, password, role, displayName) {
    const cleanEmail = email.trim().toLowerCase();
    const users = getUsersFromStorage();
    
    if (users[cleanEmail]) {
      throw new Error('Auth: Email already in use (Local Mock)');
    }

    const uid = `mock-uid-${Date.now()}`;
    const userProfile = {
      uid,
      email: cleanEmail,
      displayName: displayName || email.split('@')[0],
      role,
      createdAt: new Date().toISOString(),
      password
    };

    users[cleanEmail] = userProfile;
    saveUsersToStorage(users);

    currentUser = userProfile;
    localStorage.setItem('readem_current_user', JSON.stringify(currentUser));
    notifyListeners();

    return { uid, role };
  },

  /**
   * Sign in an existing account and resolve their stored role.
   * Dynamically auto-creates user if not registered to allow "any email" login.
   */
  async signIn(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const users = getUsersFromStorage();
    let userProfile = users[cleanEmail];

    if (!userProfile) {
      const uid = `mock-uid-${Date.now()}`;
      userProfile = {
        uid,
        email: cleanEmail,
        displayName: email.split('@')[0],
        role: 'student',
        createdAt: new Date().toISOString(),
        password
      };
      users[cleanEmail] = userProfile;
      saveUsersToStorage(users);
    } else if (userProfile.password !== password) {
      throw new Error('Auth: Incorrect password (Local Mock)');
    }

    currentUser = userProfile;
    localStorage.setItem('readem_current_user', JSON.stringify(currentUser));
    notifyListeners();

    return { uid: userProfile.uid, role: userProfile.role };
  },

  async signOut() {
    currentUser = null;
    localStorage.removeItem('readem_current_user');
    notifyListeners();
  },

  async getUserRole(uid) {
    const users = getUsersFromStorage();
    const found = Object.values(users).find(u => u.uid === uid);
    return found ? found.role : null;
  },

  async getUserDisplayName(uid) {
    const users = getUsersFromStorage();
    const found = Object.values(users).find(u => u.uid === uid);
    return found ? (found.displayName || found.email.split('@')[0]) : uid;
  },

  /**
   * Subscribe to auth state changes. Returns the unsubscribe function.
   */
  onAuthChange(callback) {
    listeners.add(callback);
    // Fire callback with initial state asynchronously to match Firebase behavior
    setTimeout(() => {
      callback(currentUser);
    }, 0);

    return () => {
      listeners.delete(callback);
    };
  },

  getCurrentUser() {
    return currentUser;
  },
};


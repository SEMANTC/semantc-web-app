import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthError {
  code: string;
  message: string;
}

export async function login(email: string, password: string) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return { user, error: null };
  } catch (error) {
    return {
      user: null,
      error: error as AuthError
    };
  }
}

export async function register(email: string, password: string) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(user);
    return { user, error: null };
  } catch (error) {
    return {
      user: null,
      error: error as AuthError
    };
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
}

export async function updateUserProfile(user: User, data: { displayName?: string; photoURL?: string }) {
  try {
    await updateProfile(user, data);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
}

export const getErrorMessage = (code: string) => {
  switch (code) {
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-email':
      return 'Invalid email address';
    default:
      return 'An error occurred. Please try again';
  }
};
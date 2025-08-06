import { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth as clientAuth } from '../../config/firebase.config';

/**
 * Verifies a user's password for re-authentication purposes by attempting
 * to sign them in using the Firebase Authentication REST API.
 * This is used to confirm sensitive actions in the Danger Zone.
 */
export const reauthenticate = async (req: Request, res: Response): Promise<Response> => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Bad Request: "email" and "password" are required.' });
    }

    try {
        // The Firebase Admin SDK cannot verify passwords directly.
        // The secure method is to use the Firebase Auth REST API to attempt a sign-in.
        const apiKey = process.env.FIREBASE_WEB_API_KEY;
        if (!apiKey) {
            console.error('FATAL: FIREBASE_WEB_API_KEY is not defined in environment variables.');
            return res.status(500).json({ message: 'Internal Server Error: Server configuration issue.' });
        }

        const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

        const response = await fetch(firebaseAuthUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                returnSecureToken: false, 
            }),
        });

        const data = await response.json();

        // If the response is not OK, the credentials were bad.
        if (!response.ok) {
            if (data.error && (data.error.message === 'INVALID_PASSWORD' || data.error.message === 'EMAIL_NOT_FOUND')) {
                return res.status(401).json({ message: 'Unauthorized: Invalid credentials.' });
            }
            // For other potential errors from Firebase
            return res.status(401).json({ message: 'Unauthorized: Could not verify credentials.' });
        }

        // If the sign-in attempt was successful, the password is correct.
        return res.status(200).json({ message: 'User identity confirmed successfully.' });

    } catch (error: any) {
        console.error('Error during re-authentication check:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};


export const login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Bad Request: "email" and "password" are required.' });
    }

    try {
        const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
        const user = userCredential.user;
        const idToken = await user.getIdToken();
        const refreshToken = user.refreshToken; // New field needed

        return res.status(200).json({
            message: 'Login successful.',
            token: idToken,
            refreshToken: refreshToken, // Include the refresh token in the response
            user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
            },
        });
    } catch (error: any) {
        console.error('Error during login:', error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            return res.status(401).json({ message: 'Unauthorized: Invalid credentials.' });
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Bad Request: "refreshToken" is required.' });
    }

    try {
        // Use Firebase REST API to refresh the user's ID token
        const apiKey = process.env.FIREBASE_WEB_API_KEY;
        if (!apiKey) {
            console.error('FATAL: FIREBASE_WEB_API_KEY is not defined in environment variables.');
            return res.status(500).json({ message: 'Internal Server Error: Server configuration issue.' });
        }

        const firebaseRefreshUrl = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;

        const response = await fetch(firebaseRefreshUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Firebase token refresh failed:', data);
            if (data.error && data.error.message) {
                // Common Firebase refresh token errors
                if (data.error.message.includes('TOKEN_EXPIRED') || 
                    data.error.message.includes('INVALID_REFRESH_TOKEN')) {
                    return res.status(401).json({ message: 'Refresh token expired. Please login again.' });
                }
            }
            return res.status(401).json({ message: 'Invalid refresh token.' });
        }

        // Firebase returns the new tokens
        return res.status(200).json({
            accessToken: data.id_token,           // New ID token
            token: data.id_token,                 // Alternative name for compatibility
            refreshToken: data.refresh_token,     // New refresh token
            expiresIn: data.expires_in            // Token expiry time
        });

    } catch (error: any) {
        console.error('Error during token refresh:', error);
        return res.status(500).json({ message: 'Internal Server Error during token refresh.' });
    }
};
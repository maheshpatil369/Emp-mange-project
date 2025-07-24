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

        return res.status(200).json({
            message: 'Login successful.',
            token: idToken,
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
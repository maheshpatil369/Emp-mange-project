import { Request, Response } from 'express';
import * as firebaseService from '../../services/firebase.service';

/**
 * Controller to get the status of all bundle counters.
 * This is an admin-only operation.
 */
export const getBundleCountersStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
        const counters = await firebaseService.getBundleCountersFromDB();

        if (!counters) {
            return res.status(404).json({ message: 'No bundle counters found in the database.' });
        }

        return res.status(200).json(counters);

    } catch (error: any) {
        console.error('Error fetching bundle counters:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
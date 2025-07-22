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


export const resetUserProgress = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { userId, taluka } = req.body;

        if (!userId || !taluka) {
            return res.status(400).json({ message: 'Bad Request: "userId" and "taluka" are required.' });
        }

        const recycledBundleNo = await firebaseService.resetUserProgressInDB(userId, taluka);

        return res.status(200).json({
            message: `Successfully reset progress for user ${userId} in ${taluka}. Bundle #${recycledBundleNo} has been recycled.`
        });

    } catch (error: any) {
        if (error.message.includes('No active bundle found') || error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        console.error('Error resetting user progress:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};



/**
 * Controller to manually mark a bundle as complete.
 * This is an admin-only operation.
 */
export const forceCompleteBundle = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { userId, taluka, bundleNo } = req.body;

        if (!userId || !taluka || !bundleNo) {
            return res.status(400).json({ message: 'Bad Request: "userId", "taluka", and "bundleNo" are required.' });
        }

        // The service needs the location, which we can get from the user's profile.
        const user = await firebaseService.getUserFromDB(userId);
        if (!user) {
            return res.status(404).json({ message: `User with ID ${userId} not found.` });
        }

        await firebaseService.forceCompleteBundleInDB(userId, user.location, taluka, bundleNo);

        return res.status(200).json({
            message: `Successfully marked bundle #${bundleNo} in ${taluka} as complete.`
        });

    } catch (error: any) {
        console.error('Error force-completing bundle:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};



/**
 * Controller to manually assign a specific bundle to a user.
 * This is an admin-only operation.
 */
export const manualAssignBundle = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { userId, taluka, bundleNo } = req.body;

        if (!userId || !taluka || !bundleNo) {
            return res.status(400).json({ message: 'Bad Request: "userId", "taluka", and "bundleNo" are required.' });
        }

        const assignedBundle = await firebaseService.manualAssignBundleToUserInDB(userId, taluka, bundleNo);

        return res.status(200).json({
            message: `Successfully assigned bundle #${assignedBundle.bundleNo} to user ${userId} for ${taluka}.`,
            bundle: assignedBundle
        });

    } catch (error: any) {
        console.error('Error manually assigning bundle:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
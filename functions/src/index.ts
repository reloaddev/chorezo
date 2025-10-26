/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as logger from "firebase-functions/logger";
import {onDocumentUpdated} from 'firebase-functions/firestore';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {initializeApp} from 'firebase-admin/app';
import {getMessaging} from 'firebase-admin/messaging';
import {getFirestore} from 'firebase-admin/firestore';

// Initialize with explicit project configuration
initializeApp({
  projectId: 'wotohe-b06a0'
});

// Collection configuration for notifications
const COLLECTION_CONFIG = {
  'plant-tasks': {
    title: 'Plant genocide successfully prevented! 🌱',
    taskType: 'plant'
  },
  'kitchen-tasks': {
    title: 'Kitchen hygiene restored! 🧽',
    taskType: 'kitchen'
  },
  'bathroom-tasks': {
    title: 'Throne room has been detoxified! 🚽',
    taskType: 'bathroom'
  },
  'livingroom-tasks': {
    title: 'Wow, look at the shiny floor! ✨',
    taskType: 'living room'
  }
};

/**
 * Sends notification when a task is completed
 */
async function sendTaskCompletionNotification(collectionName: string, assignee: string) {
  const config = COLLECTION_CONFIG[collectionName as keyof typeof COLLECTION_CONFIG];
  if (!config) {
    logger.warn(`No notification config found for collection: ${collectionName}`);
    return;
  }

  try {
    const registrationTokenDocs = await getFirestore().collection('fcm-tokens').get();
    const registrationTokens = registrationTokenDocs.docs.map((doc: any) => doc.data().value);
    const tokenDocMap = new Map(registrationTokenDocs.docs.map((doc: any) => [doc.data().value, doc.id]));

    if (registrationTokens.length === 0) {
      logger.warn('No FCM tokens found');
      return;
    }

    const message = {
      notification: {
        title: config.title,
        body: `${assignee} completed their ${config.taskType} chore.`
      },
      tokens: registrationTokens
    };

    const response = await getMessaging().sendEachForMulticast(message);
    
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      const tokensToDelete: string[] = [];
      
      response.responses.forEach((resp: any, idx: any) => {
        if (!resp.success) {
          const failedToken = registrationTokens[idx];
          failedTokens.push(failedToken);
          
          // If token is invalid or unregistered, mark for deletion
          if (resp.error?.code === 'messaging/invalid-registration-token' || 
              resp.error?.code === 'messaging/registration-token-not-registered') {
            const docId = tokenDocMap.get(failedToken);
            if (docId) {
              tokensToDelete.push(docId);
            }
          }
        }
      });
      
      // Clean up invalid tokens
      if (tokensToDelete.length > 0) {
        const batch = getFirestore().batch();
        tokensToDelete.forEach(docId => {
          batch.delete(getFirestore().collection('fcm-tokens').doc(docId));
        });
        await batch.commit();
        logger.log(`Cleaned up ${tokensToDelete.length} invalid FCM tokens`);
      }
      
      logger.error('Failed to send notifications to tokens:', failedTokens);
    }

    logger.log(`Notification sent for ${collectionName}: ${response.successCount} successful, ${response.failureCount} failed`);
  } catch (error) {
    logger.error(`Error sending notification for ${collectionName}:`, error);
  }
}

// Notification triggers for all task collections
export const notifyPlantsChore = onDocumentUpdated("/plant-tasks/{documentId}", async (event: any) => {
  const assignee = event.data?.before.data().assignee;
  await sendTaskCompletionNotification('plant-tasks', assignee);
});

export const notifyKitchenChore = onDocumentUpdated("/kitchen-tasks/{documentId}", async (event: any) => {
  const assignee = event.data?.before.data().assignee;
  await sendTaskCompletionNotification('kitchen-tasks', assignee);
});

export const notifyBathroomChore = onDocumentUpdated("/bathroom-tasks/{documentId}", async (event: any) => {
  const assignee = event.data?.before.data().assignee;
  await sendTaskCompletionNotification('bathroom-tasks', assignee);
});

export const notifyLivingroomChore = onDocumentUpdated("/livingroom-tasks/{documentId}", async (event: any) => {
  const assignee = event.data?.before.data().assignee;
  await sendTaskCompletionNotification('livingroom-tasks', assignee);
});

// Helper function to calculate days since last completion
function calculateDaysSinceCompletion(createdAt: any): number {
  if (!createdAt) return 999; // Very old if no creation date
  const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - createdDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

// Simplified scheduled function that runs daily at 9 AM CET
export const dailyChoreReminder = onSchedule('0 13 * * *', async (event) => {
  logger.log('Running daily chore reminder check...');
  
  const collections = ['plant-tasks', 'kitchen-tasks', 'bathroom-tasks', 'livingroom-tasks'];
  
  for (const collectionName of collections) {
    try {
      // Get the most recent task (active one)
      const latestTaskQuery = await getFirestore()
        .collection(collectionName)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (latestTaskQuery.empty) {
        logger.log(`No tasks found in ${collectionName}`);
        continue;
      }
      
      const latestTask = latestTaskQuery.docs[0];
      const taskData = latestTask.data();
      const assignee = taskData.assignee;
      const createdAt = taskData.createdAt;
      const daysSince = calculateDaysSinceCompletion(createdAt);
      
      // Send notification if it's been 5 days since task creation
      if (daysSince >= 5) {
        logger.log(`${collectionName} is ${daysSince} days overdue, sending reminder to ${assignee}`);
        
        // Send reminder notification to everyone
        const config = COLLECTION_CONFIG[collectionName as keyof typeof COLLECTION_CONFIG];
        const registrationTokenDocs = await getFirestore().collection('fcm-tokens').get();
        const registrationTokens = registrationTokenDocs.docs.map((doc: any) => doc.data().value);

        if (registrationTokens.length > 0) {
          const message = {
            notification: {
              title: `⏰ ${config?.taskType || collectionName} chore reminder`,
              body: `${assignee}, the ${config?.taskType || collectionName} chore hasn't been done for ${daysSince} days. Time to get it done! 💪`
            },
            tokens: registrationTokens
          };

          const response = await getMessaging().sendEachForMulticast(message);
          logger.log(`Reminder sent for ${collectionName}: ${response.successCount} successful, ${response.failureCount} failed`);
        }
      } else {
        logger.log(`${collectionName} is only ${daysSince} days old, no reminder needed`);
      }
      
    } catch (error) {
      logger.error(`Error processing ${collectionName}:`, error);
    }
  }
  
  logger.log('Daily chore reminder completed');
});


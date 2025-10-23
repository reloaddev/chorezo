/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import {onDocumentUpdated} from 'firebase-functions/firestore';
import {initializeApp} from 'firebase-admin/app';
import {getMessaging} from 'firebase-admin/messaging';
import {getFirestore} from 'firebase-admin/firestore';

initializeApp();

export const notifyPlantsChore = onDocumentUpdated("/plant-tasks/{documentId}", async (event) => {
  const assignee = event.data?.before.data().assignee;

  const registrationTokenDocs = await getFirestore().collection('fcm-tokens').get();
  const registrationTokens = registrationTokenDocs.docs.map(doc => doc.data().value);

  const message = {
    notification: {
      title: 'Plant Chore Done',
      body: `${assignee} completed his chore.`
    },
    tokens: registrationTokens
  };

  getMessaging().sendEachForMulticast(message)
    .then(response => {
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(registrationTokens[idx]);
          }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
      }
    })

  logger.log("Plants Chore schedule updated");
});

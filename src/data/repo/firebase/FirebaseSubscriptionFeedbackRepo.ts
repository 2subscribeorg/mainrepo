import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  getFirestore
} from 'firebase/firestore'
import type { SubscriptionFeedback } from '@/domain/models'

export class FirebaseSubscriptionFeedbackRepo {
  private db = getFirestore()
  private collectionName = 'subscriptionFeedback'

  async recordFeedback(
    userId: string,
    transactionId: string,
    merchantName: string,
    amount: { amount: number; currency: string },
    date: string,
    userAction: 'confirmed' | 'rejected',
    detectionConfidence?: number,
    detectionMethod?: string
  ): Promise<SubscriptionFeedback> {
    const feedbackData = {
      userId,
      transactionId,
      merchantName,
      amount,
      date,
      userAction,
      detectionConfidence,
      detectionMethod,
      timestamp: Timestamp.now()
    }

    try {
      const docRef = await addDoc(collection(this.db, this.collectionName), feedbackData)

      return {
        id: docRef.id,
        ...feedbackData,
        timestamp: new Date().toISOString()
      } as SubscriptionFeedback
    } catch (error: any) {
      throw new Error(`Failed to save feedback: ${error.message}`)
    }
  }

  async getUserFeedback(userId: string, limitCount: number = 100): Promise<SubscriptionFeedback[]> {
    const q = query(
      collection(this.db, this.collectionName),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    try {
      const querySnapshot = await getDocs(q)
      const feedback = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as SubscriptionFeedback[]
      
      return feedback
    } catch (error: any) {
      throw new Error(`Failed to load feedback: ${error.message}`)
    }
  }

  async deleteFeedback(feedbackId: string): Promise<void> {
    await deleteDoc(doc(this.db, this.collectionName, feedbackId))
  }
}

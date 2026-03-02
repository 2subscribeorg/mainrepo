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

    console.log('Attempting to save feedback:', { userId, merchantName, userAction, collection: this.collectionName })

    try {
      const docRef = await addDoc(collection(this.db, this.collectionName), feedbackData)
      console.log('Feedback saved successfully:', docRef.id)

      return {
        id: docRef.id,
        ...feedbackData,
        timestamp: new Date().toISOString()
      } as SubscriptionFeedback
    } catch (error: any) {
      console.error('Firebase error saving feedback:', {
        code: error.code,
        message: error.message,
        userId,
        collection: this.collectionName
      })
      throw error
    }
  }

  async getUserFeedback(userId: string, limitCount: number = 100): Promise<SubscriptionFeedback[]> {
    console.log('Loading feedback from Firebase for userId:', userId)
    
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
      
      console.log(`Loaded ${feedback.length} feedback items from Firebase:`, feedback.map(f => ({ merchant: f.merchantName, action: f.userAction })))
      return feedback
    } catch (error: any) {
      console.error('Error loading feedback from Firebase:', {
        code: error.code,
        message: error.message,
        userId
      })
      throw error
    }
  }

  async deleteFeedback(feedbackId: string): Promise<void> {
    await deleteDoc(doc(this.db, this.collectionName, feedbackId))
  }
}

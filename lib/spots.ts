import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import type { Spot } from '@/types/spot';

const SPOTS_COLLECTION = 'spots';

export const saveSpot = async (spotData: Omit<Spot, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, SPOTS_COLLECTION), {
      ...spotData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving spot:', error);
    throw error;
  }
};

export const updateSpot = async (spotId: string, updates: Partial<Spot>) => {
  try {
    const spotRef = doc(db, SPOTS_COLLECTION, spotId);
    await updateDoc(spotRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating spot:', error);
    throw error;
  }
};

export const deleteSpot = async (spotId: string) => {
  try {
    const spotRef = doc(db, SPOTS_COLLECTION, spotId);
    await deleteDoc(spotRef);
  } catch (error) {
    console.error('Error deleting spot:', error);
    throw error;
  }
};

export const getAllSpots = async (): Promise<Spot[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, SPOTS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Spot));
  } catch (error) {
    console.error('Error getting spots:', error);
    throw error;
  }
}; 
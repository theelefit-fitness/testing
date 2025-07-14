import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

// Save grocery list for a user
export const saveGroceryList = async (groceryData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to save grocery list');
    }

    const listRef = doc(collection(db, 'groceryLists'));
    await setDoc(listRef, {
      userId: user.uid,
      ...groceryData,  // Spread the entire data object
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return listRef.id;
  } catch (error) {
    console.error('Error saving grocery list:', error);
    throw error;
  }
};
// Get all grocery lists for a user
export const getUserGroceryLists = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to get grocery lists');
    }

    const listsRef = collection(db, 'groceryLists');
    const q = query(listsRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting grocery lists:', error);
    throw error;
  }
};

// Get a specific grocery list by ID
export const getGroceryListById = async (listId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to get grocery list');
    }

    const listRef = doc(db, 'groceryLists', listId);
    const listDoc = await getDoc(listRef);

    if (!listDoc.exists()) {
      throw new Error('Grocery list not found');
    }

    const listData = listDoc.data();
    if (listData.userId !== user.uid) {
      throw new Error('Unauthorized access to grocery list');
    }

    return {
      id: listDoc.id,
      ...listData
    };
  } catch (error) {
    console.error('Error getting grocery list:', error);
    throw error;
  }
};

// Update a grocery list
export const updateGroceryList = async (listId, groceryData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to update grocery list');
    }

    const listRef = doc(db, 'groceryLists', listId);
    const listDoc = await getDoc(listRef);

    if (!listDoc.exists()) {
      throw new Error('Grocery list not found');
    }

    if (listDoc.data().userId !== user.uid) {
      throw new Error('Unauthorized access to grocery list');
    }

    await setDoc(listRef, {
      ...groceryData,  // Spread all new data
      updatedAt: serverTimestamp()
    }, { merge: true });  // Important: merge with existing data

    return listId;
  } catch (error) {
    console.error('Error updating grocery list:', error);
    throw error;
  }
};

// Delete a grocery list
export const deleteGroceryList = async (listId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete grocery list');
    }

    const listRef = doc(db, 'groceryLists', listId);
    const listDoc = await getDoc(listRef);

    if (!listDoc.exists()) {
      throw new Error('Grocery list not found');
    }

    if (listDoc.data().userId !== user.uid) {
      throw new Error('Unauthorized access to grocery list');
    }

    await deleteDoc(listRef);
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    throw error;
  }
}; 
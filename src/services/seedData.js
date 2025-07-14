import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import experts from '../data/expertsData';

// Function to seed expert data into Firestore
export const seedExpertsData = async () => {
  const expertsCollection = collection(db, 'experts');
  
  try {
    // Check if data already exists
    const snapshot = await getDocs(expertsCollection);
    
    if (snapshot.empty) {
      console.log('Seeding experts data to Firestore...');
      
      // Add each expert to Firestore
      const addPromises = experts.map(async (expert) => {
        // Remove the local ID before adding to Firestore
        const { id, ...expertWithoutId } = expert;
        
        try {
          const docRef = await addDoc(expertsCollection, expertWithoutId);
          console.log(`Added expert: ${expert.name} with ID: ${docRef.id}`);
          return docRef;
        } catch (error) {
          console.error(`Error adding expert ${expert.name}:`, error);
          return null;
        }
      });
      
      await Promise.all(addPromises);
      console.log('Data seeding complete!');
    } else {
      console.log('Experts data already exists in Firestore. Skipping seed.');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

export default seedExpertsData; 
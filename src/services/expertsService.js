import experts from '../data/expertsData';
import { db, auth, registerUser } from './firebase';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, query, where, arrayUnion } from 'firebase/firestore';

// Array of professional headshot images from Unsplash
const professionalImages = [
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1563701039037-5834af7e8d36?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
];

export const expertsService = {
  // Get all experts from Firestore
  getAllExperts: async () => {
    try {
      const expertsCollection = collection(db, 'experts');
      const expertsSnapshot = await getDocs(expertsCollection);
      const expertsList = expertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return expertsList;
    } catch (error) {
      console.error("Error getting experts:", error);
      // Fallback to local data if Firestore fails
      return experts;
    }
  },

  // Get expert by ID from Firestore
  getExpertById: async (id) => {
    try {
      const expertDoc = doc(db, 'experts', id);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (expertSnapshot.exists()) {
        return {
          id: expertSnapshot.id,
          ...expertSnapshot.data()
        };
      } else {
        // If not found in Firestore, try local data
        const localExpert = experts.find(expert => expert.id === parseInt(id));
        return localExpert;
      }
    } catch (error) {
      console.error("Error getting expert:", error);
      // Fallback to local data
      const expert = experts.find(expert => expert.id === parseInt(id));
      return expert;
    }
  },

  // Book a slot for an expert
  bookSlot: async (expertId, slotId) => {
    try {
      // First get the expert document
      const expertDoc = doc(db, 'experts', expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      const slotIndex = expertData.availableSlots.findIndex(
        slot => slot.id === parseInt(slotId)
      );
      
      if (slotIndex === -1) {
        return Promise.reject("Slot not found");
      }
      
      if (expertData.availableSlots[slotIndex].booked) {
        return Promise.reject("Slot already booked");
      }
      
      // Create updated slots array
      const updatedSlots = [...expertData.availableSlots];
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        booked: true
      };
      
      // Update in Firestore
      await updateDoc(expertDoc, {
        availableSlots: updatedSlots
      });
      
      // Return the updated expert data
      return {
        success: true,
        expert: {
          id: expertId,
          ...expertData,
          availableSlots: updatedSlots
        },
        message: `Successfully booked a slot with ${expertData.name}`
      };
    } catch (error) {
      console.error("Error booking slot:", error);
      // Fallback to local implementation if Firestore fails
      const expertIndex = experts.findIndex(expert => expert.id === parseInt(expertId));
      
      if (expertIndex === -1) {
        return Promise.reject("Expert not found");
      }

      const slotIndex = experts[expertIndex].availableSlots.findIndex(
        slot => slot.id === parseInt(slotId)
      );

      if (slotIndex === -1) {
        return Promise.reject("Slot not found");
      }

      if (experts[expertIndex].availableSlots[slotIndex].booked) {
        return Promise.reject("Slot already booked");
      }

      // Create a copy of the experts array with the updated booking
      const updatedExperts = [...experts];
      updatedExperts[expertIndex] = {
        ...updatedExperts[expertIndex],
        availableSlots: [
          ...updatedExperts[expertIndex].availableSlots.slice(0, slotIndex),
          {
            ...updatedExperts[expertIndex].availableSlots[slotIndex],
            booked: true
          },
          ...updatedExperts[expertIndex].availableSlots.slice(slotIndex + 1)
        ]
      };

      // Update local data
      Object.assign(experts, updatedExperts);
      
      return {
        success: true,
        expert: experts[expertIndex],
        message: `Successfully booked a slot with ${experts[expertIndex].name}`
      };
    }
  },

  // Register a new expert in Firestore
  registerExpert: async (expertData) => {
    try {
      // Choose a random image from the array
      const randomImage = professionalImages[Math.floor(Math.random() * professionalImages.length)];
      
      // First, register the expert in Shopify and Firebase
      const additionalData = {
        firstName: expertData.name.split(' ')[0],
        lastName: expertData.name.split(' ').slice(1).join(' ')
      };
      
      // Register expert with 'expert' user type
      const authResult = await registerUser(
        expertData.email,
        expertData.password,
        'expert',
        additionalData
      );
      
      // Create a new expert object with necessary properties
      const newExpert = {
        name: expertData.name,
        specialty: expertData.specialty,
        experience: expertData.experience,
        qualifications: expertData.qualifications,
        bio: expertData.bio,
        email: expertData.email,
        phone: expertData.phone,
        // Use a random professional image
        image: randomImage,
        rating: 4.5, // Default rating for new experts
        availableSlots: [
          { id: 1, time: "Monday 9:00 AM", booked: false },
          { id: 2, time: "Tuesday 2:00 PM", booked: false },
          { id: 3, time: "Wednesday 11:00 AM", booked: false },
          { id: 4, time: "Friday 3:00 PM", booked: false }
        ],
        createdAt: new Date(),
        shopifyCustomerId: authResult.shopifyCustomerId // Store Shopify customer ID
      };

      // Add to Firestore
      const expertsCollection = collection(db, 'experts');
      const docRef = await addDoc(expertsCollection, newExpert);
      
      console.log("Expert registered in Firestore:", docRef.id);
      return { 
        success: true, 
        expertId: docRef.id,
        message: "Registration successful! You've been added to our experts list." 
      };
    } catch (error) {
      console.error("Error registering expert:", error);
      throw error;
    }
  },
  
  // Rate an expert
  rateExpert: async (expertId, userId, ratingValue) => {
    try {
      // Get the expert document
      const expertDoc = doc(db, 'experts', expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      
      // Check if ratings array exists, if not create it
      const ratings = expertData.ratings || [];
      
      // Check if user has already rated this expert
      const existingRatingIndex = ratings.findIndex(r => r.userId === userId);
      
      let updatedRatings;
      if (existingRatingIndex >= 0) {
        // Update existing rating
        updatedRatings = [...ratings];
        updatedRatings[existingRatingIndex] = {
          ...updatedRatings[existingRatingIndex],
          value: ratingValue,
          timestamp: new Date()
        };
      } else {
        // Add new rating
        updatedRatings = [
          ...ratings,
          {
            userId,
            value: ratingValue,
            timestamp: new Date()
          }
        ];
      }
      
      // Calculate average rating
      const totalRating = updatedRatings.reduce((sum, r) => sum + r.value, 0);
      const averageRating = updatedRatings.length > 0 ? totalRating / updatedRatings.length : 0;
      
      // Update in Firestore
      await updateDoc(expertDoc, {
        ratings: updatedRatings,
        rating: parseFloat(averageRating.toFixed(1)) // Round to 1 decimal place
      });
      
      // Return the updated expert data
      return {
        success: true,
        expert: {
          id: expertId,
          ...expertData,
          ratings: updatedRatings,
          rating: parseFloat(averageRating.toFixed(1))
        },
        message: `Successfully rated ${expertData.name}`
      };
    } catch (error) {
      console.error("Error rating expert:", error);
      return Promise.reject("Failed to submit rating");
    }
  },
  
  // Add a comment to an expert
  addComment: async (expertId, userId, userName, comment) => {
    try {
      // Get the expert document
      const expertDoc = doc(db, 'experts', expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      
      // Check if comments array exists, if not create it
      const comments = expertData.comments || [];
      
      // Add new comment
      const newComment = {
        userId,
        userName,
        text: comment,
        timestamp: new Date(),
        id: `comment-${Date.now()}`
      };
      
      const updatedComments = [...comments, newComment];
      
      // Update comments count
      const commentCount = (expertData.commentCount || 0) + 1;
      
      // Update in Firestore
      await updateDoc(expertDoc, {
        comments: updatedComments,
        commentCount: commentCount
      });
      
      // Return the updated expert data
      return {
        success: true,
        expert: {
          id: expertId,
          ...expertData,
          comments: updatedComments,
          commentCount: commentCount
        },
        message: `Comment added successfully`
      };
    } catch (error) {
      console.error("Error adding comment:", error);
      return Promise.reject("Failed to add comment");
    }
  },
  
  // Get comments for an expert
  getExpertComments: async (expertId) => {
    try {
      const expertDoc = doc(db, 'experts', expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      return expertData.comments || [];
    } catch (error) {
      console.error("Error getting expert comments:", error);
      return Promise.reject("Failed to retrieve comments");
    }
  },

  // Add a like to a comment
  likeComment: async (expertId, commentId, userId) => {
    try {
      const expertDoc = doc(db, 'experts', expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      const comments = expertData.comments || [];
      
      // Find the comment and update its likes
      const commentIndex = comments.findIndex(c => c.id === commentId);
      if (commentIndex === -1) {
        return Promise.reject("Comment not found");
      }
      
      const comment = comments[commentIndex];
      const likes = comment.likes || [];
      const userLiked = likes.includes(userId);
      
      if (userLiked) {
        // Unlike if already liked
        comment.likes = likes.filter(id => id !== userId);
        comment.likesCount = (comment.likesCount || 1) - 1;
      } else {
        // Add like
        comment.likes = [...likes, userId];
        comment.likesCount = (comment.likesCount || 0) + 1;
      }
      
      // Update in Firestore
      await updateDoc(expertDoc, {
        comments: comments
      });
      
      return {
        success: true,
        liked: !userLiked,
        likesCount: comment.likesCount,
        message: `Comment ${userLiked ? 'unliked' : 'liked'} successfully`
      };
    } catch (error) {
      console.error("Error liking comment:", error);
      return Promise.reject("Failed to like comment");
    }
  }
};

export default expertsService; 
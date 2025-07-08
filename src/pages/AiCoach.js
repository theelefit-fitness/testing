import "./AiCoach.css";
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ref, push, serverTimestamp } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { database, db, auth } from '../services/firebase';    
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const AIFitnessCoach = () => {
  // State management
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [showPlans, setShowPlans] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastProcessedGoal, setLastProcessedGoal] = useState('');
  const [openMealAccordion, setOpenMealAccordion] = useState('');
  const [openMealSubAccordion, setOpenMealSubAccordion] = useState('');
  const [openWorkoutAccordion, setOpenWorkoutAccordion] = useState('');
  const [currentPopupGoal, setCurrentPopupGoal] = useState(null);
  const [timeline, setTimeline] = useState(3); // Default 3 months
  const [weeklySchedule, setWeeklySchedule] = useState(7); // Default 7 days
  const [expectedResults, setExpectedResults] = useState('');
  const [inputError, setInputError] = useState(false); // Added for error state
  const [inputLocked, setInputLocked] = useState(true); // Default to locked
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false); // Shopify customer state
  const [customerData, setCustomerData] = useState(null); // Shopify customer data
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    height: '',
    currentWeight: '',
    targetWeight: '',
    activityLevel: '',
    experienceLevel: '',
    workoutDays: '',
    timeframe: '3',
    healthConditions: []
  });
  // Add new state for warning message
  const [warningMessage, setWarningMessage] = useState('');

  // Refs
  const loadingAnimationRef = useRef(null);
  const plansContainerRef = useRef(null);
  const mealAccordionRef = useRef(null);
  const workoutAccordionRef = useRef(null);

  // Data
  const suggestions = [
    { text: "Lose Weight", icon: "fa-fire" },
    { text: "Build Muscle", icon: "fa-dumbbell" },
    { text: "Get Fit", icon: "fa-running" },
    { text: "Get Stronger", icon: "fa-mountain" },
    { text: "Stay Flexible", icon: "fa-stopwatch" },
    { text: "Be Athletic", icon: "fa-chart-line" }
  ];

  const goalData = {
    "Lose Weight": {
      icon: "fa-fire",
      color: "#e74c3c",
      description: "Focus on calorie deficit and cardio exercises to achieve sustainable weight loss."
    },
    "Build Muscle": {
      icon: "fa-dumbbell",
      color: "#3498db",
      description: "Combine strength training with proper nutrition to increase muscle mass."
    },
    "Get Fit": {
      icon: "fa-running",
      color: "#2ecc71",
      description: "Enhance your cardiovascular fitness through consistent aerobic exercises."
    },
    "Get Stronger": {
      icon: "fa-mountain",
      color: "#f1c40f",
      description: "Focus on progressive overload and compound movements for overall strength."
    },
    "Stay Flexible": {
      icon: "fa-stopwatch",
      color: "#9b59b6",
      description: "Incorporate stretching and mobility exercises for better range of motion."
    },
    "Be Athletic": {
      icon: "fa-chart-line",
      color: "#1abc9c",
      description: "Enhance your overall athletic abilities through targeted training programs."
    }
  };

  // Add this object for meal calorie ranges
  const mealCalories = {
    breakfast: {
      min: 300,
      max: 400
    },
    lunch: {
      min: 500,
      max: 600
    },
    snack: {
      min: 150,
      max: 200
    },
    dinner: {
      min: 500,
      max: 700
    }
  };

  // Utility functions
  const cleanText = (text) => {
    return text
      .replace(/[^\w\s.,()-:]/g, '') // Allow only alphanumeric, spaces, dots, commas, parentheses, hyphens, and colons
      .replace(/\s+/g, ' ')
      .trim();
  };

  // API endpoint for production or development
  const getApiUrl = () => {
    // Use env variable if available, otherwise fallback to these options
    if (process.env.NODE_ENV === 'development') {
      return 'http://127.0.0.1:5000/chat'; // Local development
    } else {
      // In production, use the EleFit API endpoint 
      return 'https://yantraprise.com/chat';
    }
  };

  const cleanItemText = (text) => {
    // More thorough cleaning for list items
    return text
      .replace(/[^\w\s.,()-:]/g, '') // Remove special characters
      .replace(/^[-–—•●◆◇▪▫■□★☆*]+\s*/, '') // Remove bullet points at start
      .replace(/^\d+[\.\)]\s*/, '') // Remove numbered list markers
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  const formatResponse = (text) => {
    // Only remove special characters while preserving numbers, dots, and parentheses
    let cleaned = text
      .replace(/[│├─└┌┐•●◆◇▪▫■□★☆\[\]{}*]/g, '') // Remove special characters
      .replace(/\s{3,}/g, '\n\n') // Normalize multiple spaces to double newlines
      .trim();
    
    // Pre-processing for better day detection - add newlines before days
    cleaned = cleaned.replace(/(Day\s*\d+\s*[-:])/gi, '\n$1');
    
    // Ensure consistent formatting for meal plans
    cleaned = cleaned.replace(/MEAL_PLAN(?:\s+for\s+[\w\s]+)?:/gi, 'MEAL_PLAN:');
    cleaned = cleaned.replace(/WORKOUT_PLAN(?:\s+for\s+[\w\s]+)?:/gi, 'WORKOUT_PLAN:');
    
    // Handle variations in header formats
    cleaned = cleaned.replace(/\*\*MEAL PLAN\*\*/gi, 'MEAL_PLAN:');
    cleaned = cleaned.replace(/###\s*MEAL PLAN\s*/gi, 'MEAL_PLAN:');
    cleaned = cleaned.replace(/\*\*WORKOUT PLAN\*\*/gi, 'WORKOUT_PLAN:');
    cleaned = cleaned.replace(/###\s*WORKOUT PLAN\s*/gi, 'WORKOUT_PLAN:');
    
    // Cleanup markdown formatting
    cleaned = cleaned.replace(/\*\*Day\s*(\d+):\*\*\s*/gi, 'Day $1:');
    cleaned = cleaned.replace(/\*\*Total Daily Calories:\*\*\s*(\d+)/gi, 'Total Daily Calories: $1');
    cleaned = cleaned.replace(/\*\*Timeline:\*\*\s*(\d+)\s*months?/gi, 'Timeline: $1 months');
    cleaned = cleaned.replace(/\*\*Weekly Schedule:\*\*\s*(\d+)\s*days?/gi, 'Weekly Schedule: $1 days');
    cleaned = cleaned.replace(/\*\*Expected Results:\*\*\s*/gi, 'Expected Results: ');
    cleaned = cleaned.replace(/\*\*Day\s*(\d+)\s*-\s*([^:]+):\*\*/gi, 'Day $1 - $2:');
    cleaned = cleaned.replace(/\*\*/g, '');
    cleaned = cleaned.replace(/\*/g, '');
    cleaned = cleaned.replace(/---/g, '');
    
    // Ensure there's a clear separator between meal plan and workout plan if both exist
    if (cleaned.includes('MEAL_PLAN:') && cleaned.includes('WORKOUT_PLAN:')) {
      // Make sure WORKOUT_PLAN: is on a new line with proper spacing
      cleaned = cleaned.replace(/WORKOUT_PLAN:/g, '\n\nWORKOUT_PLAN:');
    }
    
    return cleaned;
  };

  // Animation functions
  const animateLoadingIcons = () => {
    console.log('Starting animation sequence');
    const icons = document.querySelectorAll('.loader-icon');
    console.log('Found icons:', icons.length);
    
    gsap.set(icons, { opacity: 1, y: 0, scale: 1, rotation: 0 });
    
    const masterTimeline = gsap.timeline({ repeat: -1 });
    
    icons.forEach((icon, index) => {
      const duration = 2;
      const delay = index * 0.2;
      
      masterTimeline.to(icon, {
        keyframes: [
          { 
            y: -15,
            scale: 1.1,
            rotation: 360,
            duration: duration/2,
            ease: "power1.inOut"
          },
          { 
            y: 0,
            scale: 1,
            rotation: 360,
            duration: duration/2,
            ease: "power1.inOut"
          }
        ],
      }, delay);
    });

    gsap.to('.loading-text', {
      scale: 1.05,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });

    gsap.to('.loading-text', {
      backgroundPosition: '100% 50%',
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "none"
    });
    
   
    
    console.log('Animation sequence started');
  };

  // Helper functions for icons and types
  const getMealIcon = (mealType) => {
    const iconMap = {
      'Breakfast': 'fa-sun',
      'Lunch': 'fa-utensils',
      'Snack': 'fa-apple-alt',
      'Dinner': 'fa-moon'
    };
    return iconMap[mealType] || 'fa-utensils';
  };

  const getWorkoutIcon = (focusArea) => {
    if (focusArea.toLowerCase().includes('cardio')) return 'fa-heartbeat';
    if (focusArea.toLowerCase().includes('lower')) return 'fa-running';
    if (focusArea.toLowerCase().includes('upper')) return 'fa-dumbbell';
    if (focusArea.toLowerCase().includes('hiit')) return 'fa-bolt';
    if (focusArea.toLowerCase().includes('active')) return 'fa-walking';
    return 'fa-dumbbell';
  };

  const getWorkoutType = (focusArea) => {
    // If focusArea is a number (day number), use it to determine workout type
    if (typeof focusArea === 'number') {
      const dayNumber = focusArea;
      // Create a rotation of workout types based on day number
      const types = [
        'Upper Body',
        'Lower Body',
        'Cardio & Endurance',
        'Core & Abs',
        'Total Body',
        'Flexibility & Recovery',
        'HIIT Training'
      ];
      return types[(dayNumber - 1) % types.length];
    }
    
    // If focusArea is a string, check if it contains specific keywords
    if (typeof focusArea === 'string') {
    if (focusArea.toLowerCase().includes('cardio')) return 'Cardio & Endurance';
    if (focusArea.toLowerCase().includes('lower')) return 'Lower Body';
    if (focusArea.toLowerCase().includes('upper')) return 'Upper Body';
      if (focusArea.toLowerCase().includes('hiit')) return 'HIIT Training';
      if (focusArea.toLowerCase().includes('active') || focusArea.toLowerCase().includes('recovery')) return 'Flexibility & Recovery';
    if (focusArea.toLowerCase().includes('total')) return 'Total Body';
      if (focusArea.toLowerCase().includes('core') || focusArea.toLowerCase().includes('abs')) return 'Core & Abs';
    }
    
    return 'Mixed Training';
  };

  // Function to store data in Firebase
  const storeSubmissionInFirebase = (prompt) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Try to get customer data from Liquid-injected script first
      let shopifyCustomerId = 'guest';
      let shopifyCustomerName = 'guest';
      let shopifyCustomerEmail = 'guest';
      
      try {
        const customerDataScript = document.getElementById('shopify-customer-data');
        if (customerDataScript) {
          const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
          if (shopifyCustomerData.id) {
            shopifyCustomerId = shopifyCustomerData.id;
            shopifyCustomerName = `${shopifyCustomerData.first_name || ''} ${shopifyCustomerData.last_name || ''}`.trim() || 'guest';
            shopifyCustomerEmail = shopifyCustomerData.email || 'guest';
          }
        }
      } catch (e) {
        console.log('Error parsing Shopify customer data script:', e);
      }

      // Fallback to window.customer_data if available
      if (shopifyCustomerId === 'guest' && window.customer_data?.id) {
        shopifyCustomerId = window.customer_data.id;
        shopifyCustomerName = `${window.customer_data.first_name || ''} ${window.customer_data.last_name || ''}`.trim() || 'guest';
        shopifyCustomerEmail = window.customer_data.email || 'guest';
      }

      // Final fallback to other sources
      if (shopifyCustomerId === 'guest' && window.Shopify?.customer?.id) {
        shopifyCustomerId = window.Shopify.customer.id;
        shopifyCustomerName = `${window.Shopify.customer.first_name || ''} ${window.Shopify.customer.last_name || ''}`.trim() || 'guest';
        shopifyCustomerEmail = window.Shopify.customer.email || 'guest';
      }

      const submissionData = {
        prompt: prompt,
        shopifyUserId: shopifyCustomerId,
        shopifyUsername: shopifyCustomerName,
        shopifyUserEmail: shopifyCustomerEmail,
        requestTime: serverTimestamp(),
        clientTimestamp: timestamp,
        isLoggedIn: isCustomerLoggedIn,
        formData: currentPopupGoal ? { ...formData } : null,
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };
      
      console.log('Storing submission in Firebase:', submissionData);
      
      const fitnessGoalsRef = ref(database, 'fitnessGoals');
      push(fitnessGoalsRef, submissionData)
        .then(() => {
          console.log('Successfully stored submission in Firebase');
        })
        .catch((error) => {
          console.error('Firebase push error:', error);
        });
    } catch (error) {
      console.error('Error storing submission in Firebase:', error);
    }
  };

  // Event handlers
  const handleRecommendation = async () => {
    if (!fitnessGoal.trim()) {
      setInputError(true);
      return;
    }
    
    setInputError(false);
    setWarningMessage(''); // Clear any previous warning
    setIsLoading(true);
    setShowPlans(false);

    try {
      // Get user details from Firebase
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // Check if user details are missing for normal users and show warning
      if (userData?.userType !== 'expert' && 
          (!userData?.height || !userData?.weight || !userData?.dateOfBirth || 
           !userData?.healthGoals || !userData?.dietaryRestrictions || !userData?.allergies)) {
        setWarningMessage('⚠️ For better personalized results, please complete your health information in your dashboard.');
      }

      // Always prepare user details, using empty strings for missing values
      const userDetails = {
        height: userData?.height || "",
        weight: userData?.weight || "",
        dateOfBirth: userData?.dateOfBirth || "",
        healthGoals: userData?.healthGoals || "",
        dietaryRestrictions: userData?.dietaryRestrictions || "",
        allergies: userData?.allergies || ""
      };

      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ 
          prompt: fitnessGoal,
          userDetails: userDetails
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw response:', data.reply);

      // Format the response to ensure it has the required structure
      let formattedResponse = data.reply;
      
      // Convert markdown headers to our format
      formattedResponse = formattedResponse
        .replace(/###\s*Meal Plan\s*/g, 'MEAL_PLAN:\n')
        .replace(/###\s*Workout Plan\s*/g, '\nWORKOUT_PLAN:\n')
        .replace(/\*\*Day\s*(\d+):\*\*\s*/g, 'Day $1:\n')
        .replace(/\*\*Total Daily Calories:\*\*\s*(\d+)/g, 'Total Daily Calories: $1')
        .replace(/\*\*Timeline:\*\*\s*(\d+)\s*months?/g, 'Timeline: $1 months')
        .replace(/\*\*Weekly Schedule:\*\*\s*(\d+)\s*days?/g, 'Weekly Schedule: $1 days')
        .replace(/\*\*Expected Results:\*\*\s*/g, 'Expected Results: ')
        .replace(/\*\*Day\s*(\d+)\s*-\s*([^:]+):\*\*/g, 'Day $1 - $2:')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/---/g, '');

      // Ensure we have the required markers
      if (!formattedResponse.includes('MEAL_PLAN:')) {
        formattedResponse = 'MEAL_PLAN:\n' + formattedResponse;
      }
      
      if (!formattedResponse.includes('WORKOUT_PLAN:')) {
        const lastDayMatch = formattedResponse.match(/Day\s*7:.*?(?=WORKOUT_PLAN:|$)/s);
        if (lastDayMatch) {
          const insertIndex = lastDayMatch.index + lastDayMatch[0].length;
          formattedResponse = formattedResponse.slice(0, insertIndex) + '\n\nWORKOUT_PLAN:\n' + formattedResponse.slice(insertIndex);
        }
      }

      console.log('Formatted response:', formattedResponse);
      parseResponse(formattedResponse);
      setShowPlans(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const parseResponse = (response) => {
    // Clean up the response first
    let cleanedResponse = formatResponse(response);
    
    console.log('Cleaned response for parsing:', cleanedResponse);

    // Split into meal plan and workout plan sections
    // Use a more robust regex that accounts for various formats
    const mealPlanMatch = cleanedResponse.match(/MEAL_PLAN:([\s\S]*?)(?=WORKOUT_PLAN:|$)/i);
    
    // Try multiple patterns to extract workout plan
    let workoutPlanMatch = cleanedResponse.match(/WORKOUT_PLAN:([\s\S]*?)$/i);
    if (!workoutPlanMatch) {
      console.log('Trying alternate workout plan pattern');
      // Alternative pattern for cases where 'WORKOUT_PLAN:' might be formatted differently
      workoutPlanMatch = cleanedResponse.match(/(?:WORKOUT|EXERCISE)[\s_]*PLAN:?([\s\S]*?)$/i);
    }
    
    // Last resort - if we have markdown sections, try to find workout section after meal plan
    if (!workoutPlanMatch && cleanedResponse.includes('###')) {
      console.log('Trying to find workout section using markdown headers');
      const sections = cleanedResponse.split(/###\s+/);
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].toLowerCase().includes('workout') || 
            sections[i].toLowerCase().includes('exercise')) {
          workoutPlanMatch = {1: sections[i]};
          break;
        }
      }
    }
    
    // Create default meal plan structure if none found or if parsing fails
    const defaultMealPlan = [];
    for (let i = 1; i <= 7; i++) {
      defaultMealPlan.push({
        dayNumber: i,
        meals: [
          { type: 'Breakfast', calories: 300, items: ['Oatmeal with berries - 1/2 cup', 'Greek yogurt - 150g', 'Almonds - 10 pieces'] },
          { type: 'Lunch', calories: 400, items: ['Grilled chicken salad - 200g', 'Whole grain bread - 1 slice', 'Olive oil dressing - 1 tbsp'] },
          { type: 'Snack', calories: 150, items: ['Apple - 1 medium', 'Peanut butter - 1 tbsp', 'Celery sticks - 2 pieces'] },
          { type: 'Dinner', calories: 450, items: ['Baked salmon - 150g', 'Steamed broccoli - 1 cup', 'Brown rice - 1/2 cup'] }
        ]
      });
    }
    
    // Create default workout sections
    const defaultWorkout = [];
    const workoutTypes = ['Strength Training', 'Cardio', 'HIIT', 'Flexibility', 'Core', 'Upper Body', 'Lower Body'];
    for (let i = 1; i <= 7; i++) {
      defaultWorkout.push({
        dayNumber: i,
        workoutType: workoutTypes[i % workoutTypes.length],
        exercises: [
          { number: 1, description: 'Push-ups (3 sets of 10 reps)' },
          { number: 2, description: 'Squats (3 sets of 15 reps)' },
          { number: 3, description: 'Lunges (3 sets of 10 reps each leg)' },
          { number: 4, description: 'Plank (3 sets of 30 seconds)' }
        ]
      });
    }
    
    if (!mealPlanMatch) {
      console.error('Response missing required meal plan section');
      setMealPlansByDay(defaultMealPlan);
      setWorkoutSections(defaultWorkout);
      return;
    }

    const mealPlanRaw = mealPlanMatch[1].trim();
    const workoutPlanRaw = workoutPlanMatch ? workoutPlanMatch[1].trim() : '';
    
    console.log('Extracted meal plan:', mealPlanRaw);
    console.log('Extracted workout plan:', workoutPlanRaw);
    
    let extractedWorkoutContent = workoutPlanRaw;
    
    if (!workoutPlanRaw) {
      console.warn('No workout plan section found - attempting to extract workout info from full response');
      // Search for workout-like content in the entire response as a fallback
      const fullResponseLines = cleanedResponse.split('\n');
      const workoutLines = [];
      let foundWorkoutSection = false;
      
      // Look for workout-related keywords in lines
      for (let i = 0; i < fullResponseLines.length; i++) {
        const line = fullResponseLines[i];
        if (!foundWorkoutSection) {
          // Check if this line indicates the start of workout content
          if (line.match(/work\s*out|exercise|training|fitness/i) && 
              !line.match(/meal|breakfast|lunch|dinner|snack/i)) {
            foundWorkoutSection = true;
            workoutLines.push(line);
          }
        } else {
          // Once we've found the workout section, add lines that don't look like meal content
          if (!line.match(/meal|breakfast|lunch|dinner|snack/i) ||
              line.match(/day\s*\d+|exercise|workout|training/i)) {
            workoutLines.push(line);
          }
        }
      }
      
      if (workoutLines.length > 0) {
        console.log('Found potential workout content:', workoutLines.join('\n'));
        // Use this as our workout plan raw text
        extractedWorkoutContent = workoutLines.join('\n');
        // Only use this if it looks like workout content
        if (!extractedWorkoutContent.match(/day\s*\d+|exercise|workout|training/i)) {
          console.log('Extracted content doesn\'t look like workout content, using default');
          extractedWorkoutContent = '';
        }
      }
    }

    // First, detect how many days are in the response
    const dayMatches = mealPlanRaw.match(/Day\s*\d+:/gi) || [];
    let numDays = dayMatches.length;
    
    // Fallback to default if no days detected
    if (numDays === 0) {
      // Look for a requested day count in the input
      const daysMatch = fitnessGoal.match(/(\d+)[ -]day/i);
      if (daysMatch) {
        numDays = parseInt(daysMatch[1]);
        console.log(`No days detected in response, using requested days from input: ${numDays}`);
      } else {
        numDays = 7;
        console.warn('No days detected in meal plan and none in input, defaulting to 7 days');
      }
    } else {
      // Try to extract the actual day numbers
      let highestDay = 0;
      dayMatches.forEach(match => {
        const dayNum = parseInt(match.match(/\d+/)[0]);
        if (dayNum > highestDay) highestDay = dayNum;
      });
      
      // Use the highest day number found
      if (highestDay > 0 && highestDay !== numDays) {
        console.log(`Found highest day ${highestDay} which differs from day count ${numDays}, using highest day`);
        numDays = highestDay;
      }
    }
    
    console.log(`Detected ${numDays} days in the meal plan response`);

    // Process meal plans by day
    const mealPlansByDay = [];
    let currentDay = null;
    let currentMealType = null;
    let currentMealItems = [];

    // Initialize array with detected number of days
    for (let i = 1; i <= numDays; i++) {
      mealPlansByDay.push({
        dayNumber: i,
        meals: [
          {
            type: 'Breakfast',
            calories: 300,
            items: []
          },
          {
            type: 'Lunch',
            calories: 400,
            items: []
          },
          {
            type: 'Snack',
            calories: 150,
            items: []
          },
          {
            type: 'Dinner',
            calories: 450,
            items: []
          }
        ]
      });
    }

    // Split meal plan into lines and process
    const mealPlanLines = mealPlanRaw.split('\n').map(line => line.trim()).filter(Boolean);
    
    mealPlanLines.forEach(line => {
      // Check for new day
      const dayMatch = line.match(/Day\s*(\d+):/i);
      if (dayMatch) {
        currentDay = parseInt(dayMatch[1]);
        currentMealType = null;
        currentMealItems = [];
        return;
      }

      // Check for meal type with calories - handle multiple formats
      const mealTypeMatch = line.match(/(Breakfast|Lunch|Snack|Dinner)\s*(?:\((\d+)\s*(?:kcal|calories?)?\)|(?:\s*-\s*)?(\d+)\s*(?:kcal|calories?))?(?:\s*:|$)/i);
      if (mealTypeMatch) {
        currentMealType = mealTypeMatch[1];
        // Try to get calories from either the parentheses format or the dash format
        const calories = parseInt(mealTypeMatch[2] || mealTypeMatch[3]) || 0;
        
        console.log(`Found meal type: ${currentMealType}, calories: ${calories}`);
        
        // Update calories for current meal type
        if (currentDay) {
          const dayIndex = currentDay - 1;
          if (dayIndex >= 0 && dayIndex < mealPlansByDay.length) {
            const mealIndex = mealPlansByDay[dayIndex].meals.findIndex(m => m.type === currentMealType);
            if (mealIndex !== -1) {
              mealPlansByDay[dayIndex].meals[mealIndex].calories = calories;
            }
          }
        }
        return;
      }

      // If line starts with a number or bullet, it's a meal item
      if (/^(\d+\.|[\-•●])/.test(line)) {
        const itemMatch = line.match(/^(?:\d+\.|[\-•●])\s*(.*?)(?:\s*-\s*(\d+)\s*(?:kcal|calories?|cal))?$/i);
        if (itemMatch) {
          const item = itemMatch[1].trim();
          const itemCalories = itemMatch[2] ? parseInt(itemMatch[2]) : 0;
          
        if (currentDay && currentMealType) {
          const dayIndex = currentDay - 1;
          if (dayIndex >= 0 && dayIndex < mealPlansByDay.length) {
            const mealIndex = mealPlansByDay[dayIndex].meals.findIndex(m => m.type === currentMealType);
            if (mealIndex !== -1) {
              mealPlansByDay[dayIndex].meals[mealIndex].items.push(item);
                // Update meal calories if we found calories in the item
                if (itemCalories > 0) {
                  const currentCalories = mealPlansByDay[dayIndex].meals[mealIndex].calories || 0;
                  mealPlansByDay[dayIndex].meals[mealIndex].calories = currentCalories + itemCalories;
                }
              }
            }
          }
        }
      }
    });

    // Make sure each meal has exactly 3 items
    mealPlansByDay.forEach(dayPlan => {
      dayPlan.meals.forEach(meal => {
        // If no items were found, add placeholders
        if (meal.items.length === 0) {
          if (meal.type === 'Breakfast') {
            meal.items = ['Oatmeal with berries - 1/2 cup', 'Greek yogurt - 150g', 'Almonds - 10 pieces'];
          } else if (meal.type === 'Lunch') {
            meal.items = ['Grilled chicken salad - 200g', 'Whole grain bread - 1 slice', 'Olive oil dressing - 1 tbsp'];
          } else if (meal.type === 'Snack') {
            meal.items = ['Apple - 1 medium', 'Peanut butter - 1 tbsp', 'Celery sticks - 2 pieces'];
            if (meal.calories === 0) meal.calories = 150;
          } else if (meal.type === 'Dinner') {
            meal.items = ['Baked salmon - 150g', 'Steamed broccoli - 1 cup', 'Brown rice - 1/2 cup'];
            if (meal.calories === 0) meal.calories = 450;
          }
        }
        // Ensure we have exactly 3 items
        while (meal.items.length < 3) {
          meal.items.push('Additional item - 1 serving');
        }
        if (meal.items.length > 3) {
          meal.items = meal.items.slice(0, 3);
        }
      });
    });

    // Process workout plan if available
    const workoutSections = [];
    const workoutDayCount = numDays; // Use same number of days as meal plan
    
    // Initialize workout sections with default structure
    for (let i = 1; i <= workoutDayCount; i++) {
      const workoutType = getWorkoutType(i);
      workoutSections.push({
        dayNumber: i,
        workoutType: workoutType,
        exercises: []
      });
    }

    let currentWorkoutDay = null;
    let currentWorkoutType = null;
    let currentExercises = [];

    if (extractedWorkoutContent) {
      const workoutPlanLines = extractedWorkoutContent.split('\n').map(line => line.trim()).filter(Boolean);
    let isProcessingWorkout = false;
      let timelineFound = false;
      let expectedResultsFound = false;

      console.log("Processing workout plan with lines:", workoutPlanLines.length);

      workoutPlanLines.forEach((line, index) => {
        console.log(`Processing workout line ${index}: ${line}`);
        
        // Capture Timeline and Expected Results but don't process as workout days
        if (line.includes('Timeline:')) {
          timelineFound = true;
          const timelineMatch = line.match(/Timeline:\s*(\d+)\s*months?/i);
          if (timelineMatch) {
            setTimeline(parseInt(timelineMatch[1]));
          }
        return;
      }

        if (line.includes('Weekly Schedule:')) {
          const scheduleMatch = line.match(/Weekly Schedule:\s*(\d+)\s*days?/i);
          if (scheduleMatch) {
            setWeeklySchedule(parseInt(scheduleMatch[1]));
          }
          return;
        }
        
        if (line.includes('Expected Results:')) {
          expectedResultsFound = true;
          const resultsText = line.replace(/Expected Results:\s*/i, '').trim();
          setExpectedResults(resultsText);
          return;
        }

        // Check for workout day header - use a more lenient regex pattern
        // Try multiple patterns to catch different formats
        let dayMatch = line.match(/Day\s*(\d+)(?:\s*-\s*|\s*:\s*)([^:]+)(?::|$)/i);
        if (!dayMatch) {
          // Try alternate format
          dayMatch = line.match(/Day\s*(\d+)\s*[-:]?\s*(.*)/i);
        }
        
      if (dayMatch) {
        currentWorkoutDay = parseInt(dayMatch[1]);
          currentWorkoutType = dayMatch[2] ? dayMatch[2].trim() : getWorkoutType(currentWorkoutDay);
          
          // Clean up the workout type if it contains colons
          if (currentWorkoutType.includes(':')) {
            currentWorkoutType = currentWorkoutType.replace(/:/g, '').trim();
          }
          
          // If workout type is empty or just "Day", assign a meaningful type
          if (!currentWorkoutType || currentWorkoutType === 'Day' || currentWorkoutType === 'Workout') {
            currentWorkoutType = getWorkoutType(currentWorkoutDay);
          }
          
        currentExercises = [];
        isProcessingWorkout = true;
          
          console.log(`Found workout day: ${currentWorkoutDay}, type: ${currentWorkoutType}`);
        
        // Update workout type for this day
        const dayIndex = currentWorkoutDay - 1;
        if (dayIndex >= 0 && dayIndex < workoutSections.length) {
          workoutSections[dayIndex].workoutType = currentWorkoutType;
          } else if (currentWorkoutDay > 0) {
            // If the day is outside our range but valid, add it
            console.log(`Adding workout day ${currentWorkoutDay} that was outside initial range`);
            workoutSections.push({
              dayNumber: currentWorkoutDay,
              workoutType: currentWorkoutType,
              exercises: []
            });
          } else {
            console.warn(`Workout day ${currentWorkoutDay} is invalid`);
        }
        return;
      }

        // If we're processing a workout and line starts with a number or bullet, it's an exercise
        // Use a more flexible pattern to detect exercise items
        if (isProcessingWorkout && (/^(\d+\.|[\-•●])/.test(line) || /^\d+\s*[.)]/.test(line))) {
          const exercise = line.replace(/^(\d+\s*[.)]|[\-•●])\s*/, '').trim();
        if (currentWorkoutDay) {
            // Find the section for this day (it might have been added after initialization)
            const section = workoutSections.find(s => s.dayNumber === currentWorkoutDay);
            if (section) {
              console.log(`Adding exercise to day ${currentWorkoutDay}: ${exercise}`);
              section.exercises.push({
                number: section.exercises.length + 1,
              description: exercise
            });
            } else {
              console.warn(`Cannot add exercise - day ${currentWorkoutDay} not found in sections`);
          }
          } else {
            console.warn(`Cannot add exercise - no current workout day set`);
          }
        }
      });

      // If no day sections were found but there are exercise-like entries
      // Try to extract exercises directly without day headers
      if (workoutSections.every(section => section.exercises.length === 0)) {
        console.log("No workout days were detected with exercises, trying fallback parsing");
        
        // Look for lines that could be exercises (numbered items)
        let exerciseLines = workoutPlanLines.filter(line => 
          /^(\d+\s*[.)]|[\-•●])/.test(line) && 
          !line.includes('Timeline:') && 
          !line.includes('Weekly Schedule:') && 
          !line.includes('Expected Results:')
        );
        
        console.log(`Found ${exerciseLines.length} potential exercise lines without day headers`);
        
        // If we have exercises but no days, distribute them evenly
        if (exerciseLines.length > 0) {
          const exercisesPerDay = Math.max(Math.min(4, Math.ceil(exerciseLines.length / workoutDayCount)), 1);
          
          for (let dayIndex = 0; dayIndex < workoutDayCount; dayIndex++) {
            const dayExercises = exerciseLines.splice(0, exercisesPerDay);
            if (dayExercises.length === 0) break;
            
            // Add these exercises to the current day
            dayExercises.forEach(line => {
              const exercise = line.replace(/^(\d+\s*[.)]|[\-•●])\s*/, '').trim();
              workoutSections[dayIndex].exercises.push({
                number: workoutSections[dayIndex].exercises.length + 1,
                description: exercise
              });
            });
          }
        }
      }
    } else {
      console.error("No workout plan content to process, using defaults");
    }

    // Ensure each workout day has exactly 4 exercises
    workoutSections.forEach(section => {
      // Make sure workout type is meaningful
      if (!section.workoutType || section.workoutType === 'Workout' || section.workoutType === 'Day') {
        section.workoutType = getWorkoutType(section.dayNumber);
      }
      
      if (section.exercises.length === 0) {
        // Add default exercises based on workout type
        if (section.workoutType.toLowerCase().includes('cardio')) {
          section.exercises = [
            { number: 1, description: 'Jumping jacks (3 sets of 20 reps)' },
            { number: 2, description: 'High knees (2 minutes)' },
            { number: 3, description: 'Mountain climbers (3 sets of 15 reps)' },
            { number: 4, description: 'Jogging in place (5 minutes)' }
          ];
        } else if (section.workoutType.toLowerCase().includes('strength')) {
          section.exercises = [
            { number: 1, description: 'Push-ups (3 sets of 10 reps)' },
            { number: 2, description: 'Squats (3 sets of 15 reps)' },
            { number: 3, description: 'Dumbbell rows (3 sets of 12 reps)' },
            { number: 4, description: 'Plank (3 sets of 30 seconds)' }
          ];
        } else if (section.workoutType.toLowerCase().includes('flex')) {
          section.exercises = [
            { number: 1, description: 'Downward dog (hold for 30 seconds, 3 sets)' },
            { number: 2, description: 'Hamstring stretch (30 seconds each leg, 3 sets)' },
            { number: 3, description: 'Shoulder stretch (30 seconds each side, 3 sets)' },
            { number: 4, description: 'Child\'s pose (hold for 45 seconds, 3 sets)' }
          ];
    } else {
          section.exercises = [
            { number: 1, description: 'Push-ups (3 sets of 10 reps)' },
            { number: 2, description: 'Squats (3 sets of 15 reps)' },
            { number: 3, description: 'Lunges (3 sets of 10 reps each leg)' },
            { number: 4, description: 'Plank (3 sets of 30 seconds)' }
          ];
        }
      }
      
      // Ensure exactly 4 exercises
      while (section.exercises.length < 4) {
        if (section.workoutType.toLowerCase().includes('cardio')) {
          section.exercises.push({
            number: section.exercises.length + 1,
            description: 'Jumping jacks (3 sets of 20 reps)'
          });
        } else if (section.workoutType.toLowerCase().includes('strength')) {
          section.exercises.push({
            number: section.exercises.length + 1,
            description: 'Push-ups (3 sets of 12 reps)'
          });
        } else {
          section.exercises.push({
            number: section.exercises.length + 1,
            description: 'Bodyweight exercise (3 sets of 12 reps)'
          });
        }
      }
      
      // Limit to exactly 4 exercises
      if (section.exercises.length > 4) {
        section.exercises = section.exercises.slice(0, 4);
      }
      
      // Ensure exercise numbers are sequential
      section.exercises.forEach((exercise, idx) => {
        exercise.number = idx + 1;
      });
    });

    // Log the processed data for debugging
    console.log('Processed meal plans:', mealPlansByDay);
    console.log('Processed workouts:', workoutSections);

    // Log each day of workout data to see what might be missing
    workoutSections.forEach((day, index) => {
      console.log(`Workout Day ${day.dayNumber} - ${day.workoutType}: ${day.exercises.length} exercises`);
    });

    // Update state with appropriate day counts
    setMealPlansByDay(mealPlansByDay);
    setWorkoutSections(workoutSections);
  };

  const [mealSections, setMealSections] = useState([]);
  const [mealPlansByDay, setMealPlansByDay] = useState([]);
  const [workoutSections, setWorkoutSections] = useState([]);

  const toggleAccordion = (type, section) => {
    if (type === 'meal') {
      setOpenMealAccordion(openMealAccordion === section ? '' : section);
      // Reset sub-accordion when main accordion changes
      setOpenMealSubAccordion('');
    } else if (type === 'meal-sub') {
      setOpenMealSubAccordion(openMealSubAccordion === section ? '' : section);
    } else {
      setOpenWorkoutAccordion(openWorkoutAccordion === section ? '' : section);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // Set the goal immediately (even if it's the same as before)
    setFitnessGoal(suggestion);
    
    // Reset form state to empty values, but keep timeframe at default value
    setFormData({
      age: '',
      gender: '',
      height: '',
      currentWeight: '',
      targetWeight: '',
      activityLevel: '',
      experienceLevel: '',
      workoutDays: '',
      timeframe: '3',
      healthConditions: []
    });
    
    // Clear previous meal and workout plans when a new goal is selected
    setShowPlans(false);
    setMealPlansByDay([]);
    setWorkoutSections([]);
    
    // Instead of showing popup, set the current goal for highlighting and displaying details
    setCurrentPopupGoal(suggestion);
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'select-multiple') {
      const options = e.target.options;
      const selectedOptions = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selectedOptions.push(options[i].value);
        }
      }
      setFormData({
        ...formData,
        [name]: selectedOptions
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentPopupGoal) return;
    
    // Validate required fields
    if (!formData.age || !formData.gender || !formData.height || 
        !formData.currentWeight || !formData.targetWeight || 
        !formData.activityLevel || !formData.experienceLevel || 
        !formData.workoutDays) {
      alert('Please fill in all required fields.');
      return;
    }
    
    // Close popup before proceeding
    setCurrentPopupGoal(null);
    
    // Set the input value to show what's being processed
    setFitnessGoal(currentPopupGoal);
    
    // Store the submission in Firebase with form data
    storeSubmissionInFirebase(currentPopupGoal + ' (from form)');
    
    // Get the requested days from form data
    const requestedDays = parseInt(formData.workoutDays) || 5; // Default to 5 days if parsing fails
    console.log(`Form submission requesting ${requestedDays} days per week`);
    
    // Calculate BMI for personalization
    const heightInMeters = parseFloat(formData.height) / 100;
    const bmi = parseFloat(formData.currentWeight) / (heightInMeters * heightInMeters);
    const bmiRounded = Math.round(bmi * 10) / 10;
    
    // Calculate weight difference
    const weightDifference = parseFloat(formData.targetWeight) - parseFloat(formData.currentWeight);
    const weightGoalType = weightDifference < 0 ? "lose" : (weightDifference > 0 ? "gain" : "maintain");
    const absWeightDifference = Math.abs(weightDifference);
    
    // Build the prompt dynamically based on filled fields
    let enhancedUserPrompt = `Goal: ${currentPopupGoal} (Please respond in English with both MEAL_PLAN and WORKOUT_PLAN). `;
    
    // Add detailed user profile information
    enhancedUserPrompt += `I am a ${formData.age} year old ${formData.gender} with a height of ${formData.height}cm and a BMI of ${bmiRounded}. `;
    enhancedUserPrompt += `My current weight is ${formData.currentWeight}kg and I want to ${weightGoalType} ${absWeightDifference}kg to reach ${formData.targetWeight}kg. `;
    enhancedUserPrompt += `I am ${formData.activityLevel} and have ${formData.experienceLevel} experience level. `;
    
    // Add explicit day count with redundant wording to ensure the correct number of days
    enhancedUserPrompt += `I prefer to workout ${formData.workoutDays} days per week. Please provide EXACTLY ${requestedDays} days of meal plan and EXACTLY ${requestedDays} days of workout plan. I need ${requestedDays} days total, not more. `;
    
    // Add optional fields if provided
    if (formData.timeframe) {
      enhancedUserPrompt += `I want to achieve my goal in ${formData.timeframe} months. `;
    }
    
    // Add health conditions if any are selected (and not "none")
    if (formData.healthConditions.length > 0 && !formData.healthConditions.includes('none')) {
      enhancedUserPrompt += `I have the following health conditions: ${formData.healthConditions.join(', ')}. `;
      
      // Give more tailored instructions if health conditions exist
      enhancedUserPrompt += `Please provide specific modifications for my meals and workouts that accommodate these health conditions. `;
    }
    
    // Always show loading and get a fresh response for form submissions
    console.log('Setting loading state to true for form submission');
    setIsLoading(true);
    setShowPlans(false);
  
    try {
      console.clear();
      
      // First, check if this query is in the cache
      try {
        const cacheCheckResponse = await fetch(getApiUrl().replace('/chat', '/check-cache'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: enhancedUserPrompt
          })
        });
        
        if (cacheCheckResponse.ok) {
          const cacheData = await cacheCheckResponse.json();
          console.log('Cache check response:', cacheData);
          
          // If we have a cached response, use it
          if (cacheData.cached && cacheData.reply) {
            console.log('Using cached response');
            parseResponse(cacheData.reply);
            setShowPlans(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('Cache check failed:', error);
        // Continue with normal request if cache check fails
      }

      console.log('Sending API request to backend with user profile data...');
      console.log('User profile:', {
        age: formData.age,
        gender: formData.gender,
        height: formData.height,
        currentWeight: formData.currentWeight,
        targetWeight: formData.targetWeight,
        bmi: bmiRounded,
        weightGoal: weightGoalType,
        activityLevel: formData.activityLevel,
        experienceLevel: formData.experienceLevel,
        workoutDays: formData.workoutDays,
        healthConditions: formData.healthConditions
      });
      
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: enhancedUserPrompt,
          forceNew: false
        })
      });

      if (!response.ok) {
        console.error('Server response not OK:', response.status, response.statusText);
        throw new Error(`Failed to fetch data from server: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw response from server:', data);
      
      if (!data.reply) {
        console.error('No reply in response data:', data);
        throw new Error('Server response missing reply field');
      }
      
      const cleanedResponse = formatResponse(data.reply);
      
      console.log('=== Fitness Plan Generated ===');
      console.log('Goal:', currentPopupGoal);
      console.log('Form Data:', formData);
      console.log('Requested Days:', requestedDays);
      console.log('\nChatGPT Response:');
      console.log(cleanedResponse);
      console.log('==================');

      // Check if response contains the expected sections
      if (!cleanedResponse.includes('MEAL_PLAN:') || !cleanedResponse.includes('WORKOUT_PLAN:')) {
        console.error('Response missing required sections:', cleanedResponse);
        
        // Force format the response if needed
        const forcedResponse = `MEAL_PLAN:\nBreakfast: ${data.reply.includes('Breakfast') ? data.reply.split('Breakfast')[1].split('\n')[0] : 'Healthy breakfast options'}\n\nLunch: ${data.reply.includes('Lunch') ? data.reply.split('Lunch')[1].split('\n')[0] : 'Nutritious lunch options'}\n\nDinner: ${data.reply.includes('Dinner') ? data.reply.split('Dinner')[1].split('\n')[0] : 'Balanced dinner options'}\n\nWORKOUT_PLAN:\nDay 1: ${data.reply.includes('Day 1') ? data.reply.split('Day 1')[1].split('\n')[0] : 'Full body workout'}\n`;
        
        console.log('Reformatted response:', forcedResponse);
        parseResponse(forcedResponse, requestedDays);
      } else {
        parseResponse(cleanedResponse, requestedDays);
      }
      
      setLastProcessedGoal(currentPopupGoal);
      setIsLoading(false);
      setShowPlans(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
      alert(`Failed to fetch recommendations: ${error.message}. Please try again.`);
    }
  };

  // Effect for loading animation
  useEffect(() => {
    if (isLoading) {
      console.log('Loading state changed to true, triggering animation');
      animateLoadingIcons();
    } else {
      console.log('Loading state changed to false');
      // No need to clean up CSS animations, they'll stop automatically
    }
  }, [isLoading]);

  // Effect to manage popup behavior - remove it since we no longer use popups
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && currentPopupGoal) {
        setCurrentPopupGoal(null);
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [currentPopupGoal]);

  // Helper function to estimate calories for a meal item
  const estimateCalories = (mealItem) => {
    // Common keywords and their estimated calorie contributions
    const calorieEstimates = {
      'oatmeal': 150,
      'yogurt': 120,
      'greek yogurt': 130,
      'berries': 50,
      'banana': 105,
      'apple': 95,
      'orange': 62,
      'nuts': 160,
      'almond': 165,
      'peanut butter': 190,
      'eggs': 140,
      'egg': 70,
      'toast': 75,
      'bread': 80,
      'whole grain': 90,
      'chicken': 165,
      'salmon': 208,
      'fish': 180,
      'tuna': 120,
      'salad': 100,
      'rice': 130,
      'quinoa': 120,
      'avocado': 234,
      'protein': 120,
      'smoothie': 150,
      'vegetables': 50,
      'veggies': 50,
      'broccoli': 55,
      'sweet potato': 103,
      'potato': 160,
      'hummus': 166,
      'olive oil': 120,
      'cheese': 113,
      'milk': 103,
      'protein bar': 200,
      'granola': 120,
      'honey': 64,
      'fruit': 60,
      'steak': 250,
      'beef': 213,
      'turkey': 165,
      'tofu': 144,
      'lentils': 230,
      'beans': 132,
      'soup': 170,
      'wrap': 245,
      'sandwich': 260,
      'pasta': 200,
      'noodles': 190,
      'snack': 100,
    };

    // Convert meal item to lowercase for matching
    const itemLower = mealItem.toLowerCase();
    
    // Calculate total calories based on matching keywords
    let totalCalories = 0;
    let matched = false;

    // Check for each keyword in the meal item
    Object.entries(calorieEstimates).forEach(([keyword, calories]) => {
      if (itemLower.includes(keyword)) {
        totalCalories += calories;
        matched = true;
      }
    });

    // If no specific ingredients matched, estimate based on meal type indicators
    if (!matched) {
      if (itemLower.includes('breakfast')) totalCalories = 300;
      else if (itemLower.includes('lunch')) totalCalories = 400;
      else if (itemLower.includes('dinner')) totalCalories = 500;
      else if (itemLower.includes('snack')) totalCalories = 150;
      else totalCalories = 200; // Default calories if no matches
    }

    return totalCalories;
  };

  // Calculate calories for a meal (sum of all items)
  const calculateMealCalories = (items) => {
    if (!items || items.length === 0) return 0;
    let totalCals = 0;
    
    items.forEach(item => {
      // Try multiple formats for calorie extraction
      const formats = [
        /.*?(?:-\s*(\d+)\s*(?:kcal|calories?|cal))/i,  // Format: "Item - 300 kcal"
        /.*?\((\d+)\s*(?:kcal|calories?|cal)\)/i,      // Format: "Item (300 kcal)"
        /.*?(\d+)\s*(?:kcal|calories?|cal)/i           // Format: "Item 300 kcal"
      ];
      
      let itemCals = 0;
      let matched = false;
      
      // Try each format
      for (const format of formats) {
        const calorieMatch = item.match(format);
        if (calorieMatch && calorieMatch[1]) {
          itemCals = parseInt(calorieMatch[1]);
          matched = true;
          console.log(`Found calories in item "${item}": ${itemCals} (using format: ${format})`);
          break;
        }
      }
      
      // If no explicit calories found, estimate from item description
      if (!matched) {
        itemCals = estimateCalories(item);
        console.log(`Estimated calories for item "${item}": ${itemCals}`);
      }
      
      totalCals += itemCals;
    });
    
    console.log(`Total calories for meal items: ${totalCals}`);
    return totalCals;
  };

  // Calculate total daily calories
  const calculateDailyCalories = (meals) => {
    if (!meals || meals.length === 0) return 0;
    
    let totalCalories = 0;
    
    meals.forEach(meal => {
      // First try to use the meal's explicit calories
      if (meal.calories && meal.calories > 0) {
        totalCalories += meal.calories;
        console.log(`${meal.type}: Using explicit calories: ${meal.calories}`);
      } else {
        // If no explicit calories, calculate from items
        const calculatedCalories = calculateMealCalories(meal.items);
        totalCalories += calculatedCalories;
        console.log(`${meal.type}: Calculated calories from items: ${calculatedCalories}`);
      }
    });
    
    console.log(`Total daily calories: ${totalCalories}`);
    return totalCalories;
  };

  // Function to get actual customer name from Shopify
  const getCustomerName = () => {
    try {
      // Check for Liquid-injected customer data first (most reliable)
      const customerDataScript = document.getElementById('shopify-customer-data');
      if (customerDataScript) {
        try {
          const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
          if (shopifyCustomerData.first_name || shopifyCustomerData.last_name) {
            return `${shopifyCustomerData.first_name || ''} ${shopifyCustomerData.last_name || ''}`.trim();
          }
        } catch (e) {
          console.log('Error parsing Shopify customer data script:', e);
        }
      }

      // Try window.customer_data which might be set by Liquid
      if (window.customer_data) {
        const { first_name, last_name } = window.customer_data;
        if (first_name || last_name) {
          return `${first_name || ''} ${last_name || ''}`.trim();
        }
      }

      // Try other sources
      if (window.Shopify?.customer) {
        const firstName = window.Shopify.customer.first_name || '';
        const lastName = window.Shopify.customer.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) return fullName;
      }

      return null;
    } catch (error) {
      console.error('Error getting customer name:', error);
      return null;
    }
  };

  // Function to check if customer is actually logged in
  const isActuallyLoggedIn = () => {
    try {
      // Check Liquid-injected customer data first
      const customerDataScript = document.getElementById('shopify-customer-data');
      if (customerDataScript) {
        try {
          const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
          if (shopifyCustomerData.id) return true;
        } catch (e) {
          console.log('Error parsing Shopify customer data script:', e);
        }
      }

      // Check window.customer_data from Liquid
      if (window.customer_data?.id) return true;

      // Check other sources
      if (window.Shopify?.customer?.id) return true;
      if (window.meta?.page?.customerId) return true;
      
      return false;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  };

  // Check for Shopify customer session
  useEffect(() => {
    // Function to check if we're running in Shopify context
    const isInShopifyContext = () => {
      return window.Shopify !== undefined || 
             window.ShopifyAnalytics !== undefined || 
             window.meta?.page?.customerId !== undefined ||
             window.customer !== undefined ||
             document.querySelector('body.template-page') !== null;
    };

    // Function to check customer login status in Shopify
    const checkShopifyCustomer = () => {
      if (!isInShopifyContext() && process.env.NODE_ENV === 'development') {
        const urlParams = new URLSearchParams(window.location.search);
        const loggedIn = urlParams.get('loggedIn') === 'true';
        
        if (loggedIn) {
          console.log('Development mode: Simulating logged-in customer');
          setIsCustomerLoggedIn(true);
          setInputLocked(false);
          setCustomerData({
            id: '12345',
            name: 'Test Customer',
            email: 'test@example.com'
          });
        } else {
          console.log('Development mode: Simulating logged-out customer');
          setIsCustomerLoggedIn(false);
          setInputLocked(true);
        }
        return;
      }

      // Production mode - check actual login status
      const actuallyLoggedIn = isActuallyLoggedIn();
      setIsCustomerLoggedIn(actuallyLoggedIn);
      setInputLocked(!actuallyLoggedIn);

      if (actuallyLoggedIn) {
        // Try to get customer data from Liquid-injected script first
        let customerInfo = null;
        
        try {
          const customerDataScript = document.getElementById('shopify-customer-data');
          if (customerDataScript) {
            const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
            customerInfo = {
              id: shopifyCustomerData.id,
              name: `${shopifyCustomerData.first_name || ''} ${shopifyCustomerData.last_name || ''}`.trim(),
              email: shopifyCustomerData.email
            };
          }
        } catch (e) {
          console.log('Error parsing Shopify customer data script:', e);
        }

        // Fallback to window.customer_data if available
        if (!customerInfo && window.customer_data) {
          customerInfo = {
            id: window.customer_data.id,
            name: `${window.customer_data.first_name || ''} ${window.customer_data.last_name || ''}`.trim(),
            email: window.customer_data.email
          };
        }

        // Final fallback to other sources
        if (!customerInfo) {
          const customerName = getCustomerName();
          if (customerName) {
            customerInfo = {
              id: window.Shopify?.customer?.id || 
                  window.meta?.page?.customerId || 
                  'unknown',
              name: customerName,
              email: window.Shopify?.customer?.email || 
                    window.meta?.page?.customer?.email || 
                    'unknown'
            };
          }
        }

        setCustomerData(customerInfo);
      } else {
        setCustomerData(null);
      }
    };

    // Check for customer data immediately and set up an interval to check periodically
    checkShopifyCustomer();
    const interval = setInterval(checkShopifyCustomer, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Toggle lock handler - redirect to login or unlock based on context
  const toggleInputLock = () => {
    if (isCustomerLoggedIn) {
      // If already logged in, just unlock the input
      setInputLocked(false);
    } else {
      // If not logged in, redirect to Shopify login with correct return URL
      const returnPath = window.reactAiCoachUrl || "/pages/react-ai-coach";
      window.location.href = `https://theelefit.com/account/login?return_to=${returnPath}`;
    }
  };

  // PDF Document component for exporting plans
  const PlanPDFDocument = ({ fitnessGoal, mealPlansByDay, workoutSections }) => (
    <Document>
      <Page style={pdfStyles.body}>
        <Text style={pdfStyles.title}>AI Fitness Plan</Text>
        <Text style={pdfStyles.sectionTitle}>Goal:</Text>
        <Text style={pdfStyles.text}>{fitnessGoal}</Text>
        <Text style={pdfStyles.sectionTitle}>Meal Plan</Text>
        {mealPlansByDay.map((day, i) => (
          <View key={i} style={pdfStyles.daySection}>
            <Text style={pdfStyles.dayTitle}>Day {day.dayNumber}</Text>
            {/* Meal Table */}
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableRowHeader}>
                <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.mealTypeHeader }}>Meal Type</Text>
                <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.mealItemsHeader }}>Items</Text>
                <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.caloriesHeader }}>Calories</Text>
              </View>
              {day.meals.map((meal, j) => (
                <View key={j} style={[pdfStyles.tableRow, j % 2 === 0 ? pdfStyles.tableRowEven : pdfStyles.tableRowOdd]}> 
                  <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.mealTypeCell }}>{meal.type}</Text>
                  <View style={{ ...pdfStyles.tableCell, ...pdfStyles.mealItemsCell }}>
                    {meal.items.map((item, k) => (
                      <Text key={k} style={pdfStyles.mealItem}>- {item}</Text>
                    ))}
                  </View>
                  <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.caloriesCell }}>{meal.calories > 0 ? meal.calories : ''}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        <Text style={pdfStyles.sectionTitle}>Workout Plan</Text>
        {workoutSections.map((section, i) => (
          <View key={i} style={pdfStyles.daySection}>
            <Text style={pdfStyles.dayTitle}>Day {section.dayNumber}: {section.workoutType}</Text>
            {/* Workout Table */}
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableRowHeader}>
                <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.exerciseHeader }}>#</Text>
                <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.exerciseDescHeader }}>Exercise</Text>
              </View>
              {section.exercises.map((ex, j) => (
                <View key={j} style={[pdfStyles.tableRow, j % 2 === 0 ? pdfStyles.tableRowEven : pdfStyles.tableRowOdd]}> 
                  <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.exerciseNumCell }}>{j + 1}</Text>
                  <Text style={{ ...pdfStyles.tableCell, ...pdfStyles.exerciseDescCell }}>{ex.description}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );

  const pdfStyles = StyleSheet.create({
    body: { padding: 24, fontSize: 12, fontFamily: 'Helvetica' },
    title: { fontSize: 20, marginBottom: 12, fontWeight: 'bold', textAlign: 'center', color: '#7c3aed' },
    sectionTitle: { fontSize: 16, marginTop: 16, marginBottom: 6, fontWeight: 'bold', color: '#8b5cf6' },
    daySection: { marginBottom: 18 },
    dayTitle: { fontSize: 14, marginBottom: 6, fontWeight: 'bold', color: '#3498db' },
    text: { marginBottom: 4 },
    table: { display: 'table', width: 'auto', marginBottom: 8, borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e7eb' },
    tableRowHeader: { flexDirection: 'row', backgroundColor: '#8b5cf6', color: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' },
    tableRow: { flexDirection: 'row', minHeight: 18, alignItems: 'flex-start' },
    tableRowEven: { backgroundColor: '#f3f4f6' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableCell: { flex: 1, padding: 4, fontSize: 11, borderRightWidth: 1, borderRightColor: '#e5e7eb', borderRightStyle: 'solid' },
    mealTypeHeader: { fontWeight: 'bold', backgroundColor: '#e74c3c', color: 'white' },
    mealItemsHeader: { fontWeight: 'bold', backgroundColor: '#2ecc71', color: 'white' },
    caloriesHeader: { fontWeight: 'bold', backgroundColor: '#f1c40f', color: 'white' },
    mealTypeCell: { color: '#e74c3c', fontWeight: 'bold' },
    mealItemsCell: { color: '#2ecc71' },
    caloriesCell: { color: '#f1c40f', textAlign: 'center' },
    mealItem: { fontSize: 10, marginBottom: 1 },
    exerciseHeader: { fontWeight: 'bold', backgroundColor: '#6366f1', color: 'white', flex: 0.3 },
    exerciseDescHeader: { fontWeight: 'bold', backgroundColor: '#6366f1', color: 'white', flex: 2 },
    exerciseNumCell: { color: '#6366f1', textAlign: 'center', flex: 0.3 },
    exerciseDescCell: { color: '#22223b', flex: 2 },
  });

  return (
    <div className="ai-coach-container">
        
      <h1 className="ai-coach-title">
        Ask our EleFit AI Coach
      </h1>

      <div className="input-section">
      <>
  {isActuallyLoggedIn() && (
    <div className="welcome-message">
      {(() => {
        const customerName = getCustomerName();
        return customerName ? `Welcome back, ${customerName}!` : null;
      })()}
    </div>
  )}

  <div className="input-container">
    <textarea
      id="fitnessGoal"
      className={`goal-input ${inputError ? 'input-error' : ''}`}
      placeholder="Enter your fitness goal..."
      value={fitnessGoal}
      onChange={(e) => {
        setFitnessGoal(e.target.value);
        setShowPlans(false);
        e.target.style.height = '42px';
        const scrollHeight = e.target.scrollHeight;
        e.target.style.height = `${Math.max(scrollHeight, 42)}px`;
      }}
      onKeyPress={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleRecommendation();
        }
      }}
      rows="1"
    />
    <button
      className="recommend-button"
      onClick={(e) => {
        e.preventDefault();
        handleRecommendation();
      }}
    >
      Get Recommendations
    </button>
  </div>
</>

        {/* {inputLocked ? (
          <>
            <div className="custom-goal-label">Want something specific?</div>
            <div className="locked-input-container" onClick={toggleInputLock}>
              <div className="locked-input">
                <i className="fas fa-lock lock-icon"></i>
                <span className="locked-text">Enter your custom goal...</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {isCustomerLoggedIn && customerData && (
              <div className="welcome-message">Welcome back, {customerData.name || 'EleFit Member'}!</div>
            )}
            <div className="input-container">
              <textarea
                id="fitnessGoal"
                className={`goal-input ${inputError ? 'input-error' : ''}`}
                placeholder="Enter your fitness goal..."
                value={fitnessGoal}
                onChange={(e) => {
                  setFitnessGoal(e.target.value);
                  // Clear previous plans when input changes
                  setShowPlans(false);
                  
                  // Auto-adjust height based on content, with a minimum height
                  // First reset to default height to properly collapse when text is deleted
                  e.target.style.height = '42px';
                  const scrollHeight = e.target.scrollHeight;
                  
                  // Apply the new height with a small buffer to prevent flickering
                  if (e.target.value === '') {
                    e.target.style.height = '42px'; // Reset to default when empty
                  } else {
                    e.target.style.height = `${Math.max(scrollHeight, 42)}px`;
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRecommendation();
                  }
                }}
                rows="1"
              />
              <button
                className="recommend-button"
                onClick={(e) => {
                  e.preventDefault();
                  handleRecommendation();
                }}
              >
                Get Recommendations
              </button>
            </div>
          </>
        )} */}
        {inputError && (
          <div className="input-error-message">
            <i className="fas fa-exclamation-circle"></i> Please enter your fitness goal first
          </div>
        )}

        <div className="suggestions-container">
          <div className="suggestions-title">Popular Goals:</div>
          <div className="suggestion-chips">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`suggestion-chip ${currentPopupGoal === suggestion.text ? 'selected-goal' : ''}`}
                data-goal={suggestion.text}
                style={{ animation: `fadeInUp 0.5s ease forwards ${index * 0.1}s` }}
                onClick={() => handleSuggestionClick(suggestion.text)}
              >
                <i className={`fas ${suggestion.icon}`}></i>
                {suggestion.text}
              </div>
            ))}
      </div>

          {/* Display goal details below instead of in popup */}
        {currentPopupGoal && goalData[currentPopupGoal] && (
            <div className="goal-details-container" style={{ borderTopColor: goalData[currentPopupGoal].color }}>
              <div className="goal-details-content">
            <i
              key={`icon-${currentPopupGoal}`}
              className={`fas ${goalData[currentPopupGoal].icon} goal-details-icon`}
              style={{ color: goalData[currentPopupGoal].color }}
              data-goal={currentPopupGoal}
            ></i>
                <h2 className="goal-details-title">{currentPopupGoal}</h2>
                <p className="goal-details-description">{goalData[currentPopupGoal].description}</p>
                
                <form className="goal-details-form" id="goalForm" onSubmit={handleFormSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="age"
                name="age"
                min="16"
                max="100"
                required
                value={formData.age}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender <span className="required-asterisk">*</span></label>
              <select
                id="gender"
                name="gender"
                required
                value={formData.gender}
                onChange={handleFormChange}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="height">Height (cm) <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="height"
                name="height"
                min="120"
                max="250"
                required
                value={formData.height}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="currentWeight">Current Weight (kg) <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="currentWeight"
                name="currentWeight"
                min="30"
                max="200"
                step="0.1"
                required
                value={formData.currentWeight}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="targetWeight">Target Weight (kg) <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="targetWeight"
                name="targetWeight"
                min="30"
                max="200"
                step="0.1"
                required
                value={formData.targetWeight}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="activityLevel">Activity Level <span className="required-asterisk">*</span></label>
              <select
                id="activityLevel"
                name="activityLevel"
                required
                value={formData.activityLevel}
                onChange={handleFormChange}
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Lightly active (light exercise 1-3 days/week)</option>
                <option value="moderate">Moderately active (moderate exercise 3-5 days/week)</option>
                <option value="very">Very active (hard exercise 6-7 days/week)</option>
                <option value="extra">Extra active (very hard exercise & physical job)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="experienceLevel">Experience Level <span className="required-asterisk">*</span></label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                required
                value={formData.experienceLevel}
                onChange={handleFormChange}
              >
                <option value="">Select experience level</option>
                <option value="beginner">Beginner (0-1 year)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="advanced">Advanced (3+ years)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="workoutDays">Preferred Workout Days <span className="required-asterisk">*</span></label>
              <select
                id="workoutDays"
                name="workoutDays"
                required
                value={formData.workoutDays}
                onChange={handleFormChange}
              >
                <option value="">Select workout days</option>
                <option value="3">3 days per week</option>
                <option value="4">4 days per week</option>
                <option value="5">5 days per week</option>
                <option value="6">6 days per week</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="timeframe">Target Timeframe (months) <span className="optional-label">(Optional)</span></label>
            <input
              type="range"
              id="timeframe"
              name="timeframe"
              min="1"
              max="12"
              value={formData.timeframe}
              onChange={handleFormChange}
            />
            <div className="range-value" id="timeframeValue">
              {formData.timeframe} months
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="healthConditions">Health Conditions (Optional)</label>
            <select
              id="healthConditions"
              name="healthConditions"
              multiple
              value={formData.healthConditions}
              onChange={handleFormChange}
            >
              <option value="none">None</option>
              <option value="backPain">Back Pain</option>
              <option value="jointIssues">Joint Issues</option>
              <option value="heartCondition">Heart Condition</option>
              <option value="diabetes">Diabetes</option>
              <option value="asthma">Asthma</option>
              <option value="hypertension">Hypertension</option>
            </select>
          </div>

                  <div className="goal-details-buttons">
            <button
              type="button"
                      className="goal-details-button cancel"
                      onClick={() => setCurrentPopupGoal(null)}
            >
              Cancel
            </button>
                    <button type="submit" className="goal-details-button submit">
              Continue
            </button>
          </div>
        </form>
      </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="loading-animation" id="loadingAnimation">
          <div className="loader-container">
            <i className="fas fa-dumbbell loader-icon"></i>
            <i className="fas fa-running loader-icon"></i>
            <i className="fas fa-heart loader-icon"></i>
            <i className="fas fa-fire loader-icon"></i>
            <i className="fas fa-mountain loader-icon"></i>
          </div>
          <p className="loading-text">Crafting your personalized plan...</p>
      
        </div>
      )}

      {showPlans && (
        <div className="plans-container" id="plansContainer" ref={plansContainerRef}>
          <div style={{ width: '100%', textAlign: 'right', marginBottom: 16 }}>
            <PDFDownloadLink
              document={<PlanPDFDocument fitnessGoal={fitnessGoal} mealPlansByDay={mealPlansByDay} workoutSections={workoutSections} />}
              fileName="AI_Fitness_Plan.pdf"
            >
              {({ loading }) => (
                <button className="recommend-button" style={{ marginBottom: 8 }}>
                  {loading ? 'Preparing PDF...' : 'Download PDF'}
                </button>
              )}
            </PDFDownloadLink>
          </div>
          <div className="plans-grid">
            <div className="plan-section meal-section">
            <div className="plan-header">
              <i className="fas fa-utensils plan-icon"></i>
              <h2>Meal Plan</h2>
            </div>
            <div className="accordion" id="mealAccordion" ref={mealAccordionRef}>
                {mealPlansByDay.map((dayPlan) => (
                <div
                    key={`day-${dayPlan.dayNumber}`}
                  className="accordion-item"
                >
                  <div
                    className="accordion-header"
                    data-meal={`day${dayPlan.dayNumber}`}
                    onClick={() => toggleAccordion('meal', `day${dayPlan.dayNumber}`)}
                  >
                    <div className="day-header-content">
                      <i className="fas fa-calendar-day accordion-icon"></i>
                      <span style={{fontSize: '18px', fontWeight: '600' }}>Day {dayPlan.dayNumber}</span>
                    </div>
                    <div className="day-header-right">
                      <div className="total-calories">
                        <i className="fas fa-fire-alt"></i>
                        {Math.floor(calculateDailyCalories(dayPlan.meals))} cal/day
                      </div>
                      <i
                        className="fas fa-chevron-right accordion-arrow"
                        style={{
                          transform: openMealAccordion === `day${dayPlan.dayNumber}` ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                      ></i>
                    </div>
                  </div>
                  <div
                    className="accordion-content"
                    style={{
                      display: openMealAccordion === `day${dayPlan.dayNumber}` ? 'block' : 'none',
                      animation: openMealAccordion === `day${dayPlan.dayNumber}` ? 'slideDown 0.3s ease forwards' : 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div className="nested-accordion">
                        {dayPlan.meals.map((meal) => (
                          <div key={`${dayPlan.dayNumber}-${meal.type}`} className="nested-accordion-item">
                          <div 
                            className="nested-accordion-header"
                              data-meal-type={meal.type.toLowerCase()}
                              onClick={() => toggleAccordion('meal-sub', `${dayPlan.dayNumber}-${meal.type}`)}
                          >
                            <div className="meal-header-content">
                                <i className={`fas ${getMealIcon(meal.type)} nested-accordion-icon`}></i>
                                <span style={{ fontSize: '16px', fontWeight: '500' }}>{meal.type}</span>
                            </div>
                            <div className="meal-header-right">
                              <span className="calories-info">
                                  {meal.calories > 0 ? meal.calories : Math.floor(calculateMealCalories(meal.items))} cal
                              </span>
                              <i
                                className="fas fa-chevron-right nested-accordion-arrow"
                                style={{
                                    transform: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.type}` ? 'rotate(90deg)' : 'rotate(0deg)'
                                }}
                              ></i>
                            </div>
                          </div>
                          <div
                            className="nested-accordion-content"
                            style={{
                                display: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.type}` ? 'block' : 'none',
                                animation: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.type}` ? 'slideDown 0.3s ease forwards' : 'none'
                              }}
                            >
                              <ol className="numbered-list" start="1">
                                {meal.items.map((item, index) => (
                                  <li className="ai-coach-numbered-item" key={`${dayPlan.dayNumber}-${meal.type}-item-${index}`}>{item}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

            <div className="plan-section workout-section">
            <div className="plan-header">
              <i className="fas fa-dumbbell plan-icon"></i>
              <h2>Workout Plan</h2>
            </div>
            <div className="accordion" id="workoutAccordion" ref={workoutAccordionRef}>
                {workoutSections.map((section) => (
                <div
                    key={`workout-day-${section.dayNumber}`}
                  className="accordion-item"
                >
                  <div
                    className="accordion-header"
                    data-day={`day${section.dayNumber}`}
                    onClick={() => toggleAccordion('workout', `day${section.dayNumber}`)}
                  >
                    <div className="day-header-content">
                        <i className={`fas ${getWorkoutIcon(section.workoutType)} accordion-icon`}></i>
                          <span style={{ fontSize: '18px', fontWeight: '600' }}>Day {section.dayNumber}: {section.workoutType}</span>
                      </div>
                    <div className="day-header-right">
                    <i
                      className="fas fa-chevron-right accordion-arrow"
                      style={{
                        transform: openWorkoutAccordion === `day${section.dayNumber}` ? 'rotate(90deg)' : 'rotate(0deg)'
                      }}
                    ></i>
                    </div>
                  </div>
                  <div
                    className="accordion-content"
                    style={{
                      display: openWorkoutAccordion === `day${section.dayNumber}` ? 'block' : 'none',
                      animation: openWorkoutAccordion === `day${section.dayNumber}` ? 'slideDown 0.3s ease forwards' : 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <ol className="numbered-list" start="1">
                        {section.exercises.map((exercise, index) => (
                          <li className="ai-coach-numbered-item" key={`day${section.dayNumber}-exercise-${index}`}>{exercise.description}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const  AiCoach=()=> {
  return (
    <>
     <div className="main-container">
      <AIFitnessCoach />
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-panel">
          <h3>Development Testing Panel</h3>
          <div className="dev-controls">
            <a href="?loggedIn=true" className="dev-button login">Simulate Logged In</a>
            <a href="?loggedIn=false" className="dev-button logout">Simulate Logged Out</a>
          </div>
          <div className="dev-note">
            Note: This panel only appears during local development
          </div>
        </div>
      )}
     </div>
    </>
  );
}

export default AiCoach;
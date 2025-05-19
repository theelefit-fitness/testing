const experts = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    specialty: "Weight Management",
    experience: "10 years",
    qualifications: "PhD in Nutritional Sciences, Certified Dietitian",
    bio: "Dr. Johnson specializes in creating personalized weight management plans based on metabolic profiles and lifestyle factors.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    availableSlots: [
      { id: 1, time: "Monday 10:00 AM", booked: false },
      { id: 2, time: "Tuesday 2:00 PM", booked: false },
      { id: 3, time: "Wednesday 3:30 PM", booked: false },
      { id: 4, time: "Friday 11:00 AM", booked: false }
    ]
  },
  {
    id: 2,
    name: "Mark Williams",
    specialty: "Sports Nutrition",
    experience: "8 years",
    qualifications: "MS in Sports Nutrition, Certified Sports Nutritionist",
    bio: "Mark works with athletes to optimize performance through evidence-based nutritional strategies and supplement recommendations.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    availableSlots: [
      { id: 1, time: "Monday 1:00 PM", booked: false },
      { id: 2, time: "Thursday 10:00 AM", booked: false },
      { id: 3, time: "Thursday 4:00 PM", booked: false },
      { id: 4, time: "Saturday 9:00 AM", booked: false }
    ]
  },
  {
    id: 3,
    name: "Dr. Lisa Chen",
    specialty: "Digestive Health",
    experience: "12 years",
    qualifications: "MD, Board Certified in Gastroenterology, Nutrition Specialist",
    bio: "Dr. Chen helps patients with digestive disorders through dietary interventions and lifestyle modifications.",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    availableSlots: [
      { id: 1, time: "Tuesday 9:00 AM", booked: false },
      { id: 2, time: "Wednesday 2:00 PM", booked: false },
      { id: 3, time: "Friday 3:00 PM", booked: false },
      { id: 4, time: "Saturday 11:00 AM", booked: false }
    ]
  },
  {
    id: 4,
    name: "Robert Garcia",
    specialty: "Plant-Based Nutrition",
    experience: "6 years",
    qualifications: "BS in Nutrition, Plant-Based Nutrition Certificate",
    bio: "Robert specializes in helping clients transition to and thrive on plant-based diets with balanced nutrition.",
    image: "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.6,
    availableSlots: [
      { id: 1, time: "Monday 4:00 PM", booked: false },
      { id: 2, time: "Wednesday 10:00 AM", booked: false },
      { id: 3, time: "Thursday 1:00 PM", booked: false },
      { id: 4, time: "Friday 5:00 PM", booked: false }
    ]
  },
  {
    id: 5,
    name: "Jessica Thompson",
    specialty: "Prenatal Nutrition",
    experience: "9 years",
    qualifications: "RD, Certified Prenatal Nutritionist",
    bio: "Jessica works with expecting mothers to ensure optimal nutrition during pregnancy and post-partum periods.",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    availableSlots: [
      { id: 1, time: "Tuesday 11:00 AM", booked: false },
      { id: 2, time: "Wednesday 1:00 PM", booked: false },
      { id: 3, time: "Thursday 3:00 PM", booked: false },
      { id: 4, time: "Friday 2:00 PM", booked: false }
    ]
  }
];

export default experts; 
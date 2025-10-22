import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", 
});

export const fetchDashboardData = () => {
  // Mock data structure, matching the image content
  const data = {
    income: 5000,
    currency: 'RM',
    breakdown: [
      { name: 'Essentials', amount: 2500, color: '#ff7b8c' }, // Pink/Red
      { name: 'Savings', amount: 1500, color: '#f8a9a8' },    // Light Pink/Orange
      { name: 'Insurance', amount: 500, color: '#ffb9b6' },  // Pale Pink
      { name: 'Other', amount: 500, color: '#c4e0b5' }       // Light Green
    ],
    savingsGoals: [
      { id: 1, name: 'Vacations ✈', current: 200, target: 1000, deadline: '21st July, 2025' }
    ],
    expenses: [
      { name: 'Tar Kopitiam', amount: 10.50 },
      { name: 'Digi topup', amount: 30.00 },
      { name: 'Shopee', amount: 20.50 },
      { name: 'Milk tea', amount: 9.00 },
    ]
  };

  // Simulate network delay
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(data);
    }, 500);
  });
};

export default api;

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recipeSchema = new Schema({
  name: { type: String, required: true },
  ingredients: { type: String, required: true },
  steps: { type: String, required: true },
  cookingTime: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'] // Example categories
  },
  image: { type: String, required: false },
  likes: [String], // Array of usernames who liked the recipe
  comments: [{
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
});

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;

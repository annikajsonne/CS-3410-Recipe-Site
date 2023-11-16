const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const Recipe = require('./models/recipe');
const app = express();

mongoose.connect('mongodb://localhost/recipeDB', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  Recipe.find({}).sort({ 'createdAt': -1 }).exec()
    .then(recipes => {
      res.render('recipe-feed', { recipes: recipes, title: "Recent Recipes" });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('An error occurred while fetching recent recipes.');
    });
});

// Route to display the recipe creation form
app.get('/recipe-creation', (req, res) => {
  res.render('recipe-creation'); // Points to create-recipe.ejs in your views directory
});

// Route to handle recipe creation
app.post('/recipe-creation', upload.single('image'), (req, res) => {
  console.log(req.body); // This will log the form fields
  console.log(req.file); // This will log the file data
  const newRecipe = new Recipe({
    name: req.body.name,
    ingredients: req.body.ingredients,
    steps: req.body.steps,
    cookingTime: req.body.time,
    category: req.body.category,
    image: req.file ? req.file.path : ''
  });

  newRecipe.save()
    .then(() => {
      res.redirect('/');
    })
    .catch(err => {
      console.error('Error creating recipe:', err);
      res.status(500).send("Error creating recipe. Details: " + err.message);
    });
});

app.get('/recipes/:id', (req, res) => {
  const recipeId = req.params.id;

  Recipe.findById(recipeId).exec()
    .then(recipe => {
      if (!recipe) {
        return res.status(404).send('Recipe not found.');
      }
      res.render('recipe', { recipe: recipe }); // Make sure your EJS file is named recipe.ejs
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error fetching recipe.');
    });
});


app.get('/recipes/:category', (req, res) => {
  const category = req.params.category;
  Recipe.find({ category: category }, (err, recipes) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.render('recipe-list', { recipes: recipes, category: category });
    }
  });
});

app.get('/manage-recipes', (req, res) => {
  Recipe.find({}).exec()
    .then(recipes => {
      res.render('manage-recipes', { recipes: recipes });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('An error occurred while fetching recipes.');
    });
});


app.get('/edit-recipe/:id', (req, res) => {
  Recipe.findById(req.params.id).exec() // Use exec() to get a promise
    .then(recipe => {
      if (!recipe) {
        return res.status(404).send('Recipe not found.');
      }
      res.render('edit-recipe', { recipe: recipe });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error fetching recipe for edit.');
    });
});


app.post('/update-recipe/:id', upload.single('image'), (req, res) => {
  const recipeUpdate = {
    name: req.body.name,
    ingredients: req.body.ingredients,
    steps: req.body.steps,
    cookingTime: req.body.time,
    category: req.body.category
  };

  // If a new image was uploaded, add it to the update object
  if (req.file) {
    recipeUpdate.image = req.file.path;
  }

  // Use findByIdAndUpdate with a promise
  Recipe.findByIdAndUpdate(req.params.id, recipeUpdate, { new: true }).exec()
    .then(updatedRecipe => {
      // Redirect after successful update, or render a success message
      res.redirect('/manage-recipes');
    })
    .catch(err => {
      console.error('Error updating recipe:', err);
      // Handle error, possibly render an error message
      res.status(500).send("Error updating recipe. Details: " + err.message);
    });
});

app.get('/categories', async (req, res) => {
  const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Uncategorized'];
  let categorizedRecipes = {};

  for (const category of categories) {
      categorizedRecipes[category] = await Recipe.find({ 
          category: category === 'Uncategorized' ? { $exists: false } : category 
      }).exec();
  }

  res.render('categories', { categorizedRecipes });
});

app.post('/like-recipe/:id', (req, res) => {
  const recipeId = req.params.id;

  Recipe.findById(recipeId).exec() // Use exec() to get a promise
    .then(recipe => {
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      if (!recipe.likes.includes(req.body.username)) {
        recipe.likes.push(req.body.username);
        return recipe.save(); // Return the promise from save()
      } else {
        res.status(400).json({ message: "User has already liked this recipe" });
      }
    })
    .then(updatedRecipe => {
      if (updatedRecipe) { // Check if updatedRecipe is not undefined
        res.json({ likes: updatedRecipe.likes.length });
      }
    })
    .catch(err => {
      console.error('Error liking recipe:', err);
      res.status(500).json({ message: "Error liking recipe", error: err });
    });
});


app.post('/comment-recipe/:id', (req, res) => {
  const recipeId = req.params.id;
  const { username, comment } = req.body;

  Recipe.findById(recipeId).exec() // Use exec() to get a promise
    .then(recipe => {
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      recipe.comments.push({ username: username, text: comment });
      return recipe.save(); // Save and return the promise
    })
    .then(updatedRecipe => {
      res.json(updatedRecipe.comments); // Send back the updated comments
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Error posting comment", error: err });
    });
});



// For sorting by popularity (assuming 'likes' is an array field)
app.get('/recipes/feed/popular', (req, res) => {
  Recipe.aggregate([
    { $addFields: { likesCount: { $size: "$likes" } } },
    { $sort: { likesCount: -1 } }
  ])
  .then(recipes => {
    res.render('partials/recipe-list', { recipes: recipes });
  })
  .catch(err => {
    console.error(err);
    res.status(500).send('An error occurred while fetching popular recipes.');
  });
});


// For sorting by recency (assuming there is a field like 'createdAt' or 'updatedAt')
app.get('/recipes/feed/recent', (req, res) => {
  Recipe.find({}).sort({ 'createdAt': -1 })
    .then(recipes => {
      res.render('partials/recipe-list', { recipes: recipes });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('An error occurred while fetching recent recipes.');
    });
});

// Define your categories array without 'Uncategorized'
const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

// Render the categories view, which will display links to each category
app.get('/categories', (req, res) => {
  res.render('categories', { categories: categories });
});

// Route to handle requests for recipes by a specific category
app.get('/recipes/category/:category', (req, res) => {
  const category = req.params.category;
  // Define the query based on whether the category is 'uncategorized' or a specific category
  let query = category === 'uncategorized' ? { category: { $exists: false } } : { category: category };

  Recipe.find(query).exec()
    .then(recipes => {
      // Render the recipe list partial with the categorized recipes
      res.render('partials/recipe-list', { recipes: recipes, title: `Recipes: ${category}` });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('An error occurred while fetching recipes.');
    });
});

// Route to handle requests for uncategorized recipes
app.get('/recipes/uncategorized', (req, res) => {
  Recipe.find({ category: { $exists: false } }) // Logic to find uncategorized recipes
    .then(recipes => {
      // Render the recipe list partial with the uncategorized recipes
      res.render('partials/recipe-list', { recipes: recipes, title: 'Uncategorized Recipes' });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('An error occurred while fetching uncategorized recipes.');
    });
});

console.log(path.join(__dirname, 'views')); // This should output the absolute path to your views directory
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

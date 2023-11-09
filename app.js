const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const Recipe = require('./models/recipe'); // Replace with the path to your Recipe model

// Set up Express app
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost/recipeDB', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use bodyParser to parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure the 'uploads' directory exists
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Route to display the recipe creation form
app.get('/create-recipe', (req, res) => {
    res.render('create-recipe'); // Points to create-recipe.ejs in your views directory
});

// Route to handle recipe creation
app.post('/create-recipe', upload.single('image'), (req, res) => {
    const newRecipe = new Recipe({
        name: req.body.name,
        ingredients: req.body.ingredients,
        steps: req.body.steps,
        cookingTime: req.body.time,
        image: req.file ? req.file.path : ''
    });

    newRecipe.save()
        .then(recipe => res.render('recipe-success', { recipe: recipe })) // Render the success template
        .catch(error => res.render('recipe-failure', { error: error.message })); // Render the error template
});

// Route to handle displaying the recipes
app.get('/recipes', (req, res) => {
    Recipe.find({}, (err, recipes) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.render('recipe-list', { recipes: recipes }); // Points to recipe-list.ejs
        }
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
    Recipe.find({}, (err, recipes) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.render('manage-recipes', { recipes: recipes });
      }
    });
  });

  app.get('/edit-recipe/:id', (req, res) => {
    Recipe.findById(req.params.id, (err, recipe) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.render('edit-recipe', { recipe: recipe });
      }
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
  
    if (req.file) {
      recipeUpdate.image = req.file.path;
    }
  
    Recipe.findByIdAndUpdate(req.params.id, recipeUpdate, { new: true }, (err, recipe) => {
      // ... Handle response
    });
  });
  
  app.post('/like-recipe/:id', (req, res) => {
    const username = req.body.username;
    Recipe.findById(req.params.id, (err, recipe) => {
      if (err) return res.status(500).send(err);
  
      // Check if the username hasn't already liked the recipe
      if (recipe.likes.indexOf(username) === -1) {
        recipe.likes.push(username);
        recipe.save(err => {
          if (err) return res.status(500).send(err);
          res.status(200).send({ likes: recipe.likes.length }); // Send back the total number of likes
        });
      } else {
        res.status(400).send({ message: "User has already liked this recipe" });
      }
    });
  });

  app.post('/comment-recipe/:id', (req, res) => {
    const username = req.body.username;
    const commentText = req.body.comment;
  
    Recipe.findById(req.params.id, (err, recipe) => {
      if (err) return res.status(500).send(err);
  
      // Add a new comment
      recipe.comments.push({ username: username, text: commentText });
      recipe.save(err => {
        if (err) return res.status(500).send(err);
        res.status(200).send(recipe.comments); // Or render some template with the updated comments
      });
    });
  });

 // Route for recipes sorted by most likes for AJAX
app.get('/recipes/feed/popular', (req, res) => {
    Recipe.find({}).sort({ 'likes': -1 }).exec((err, recipes) => {
      if (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching popular recipes.');
      } else {
        // Render only the recipe list part of the page
        res.render('partials/recipe-list', { recipes: recipes });
      }
    });
  });
  
  // Route for recipes sorted by most recent for AJAX
  app.get('/recipes/feed/recent', (req, res) => {
    Recipe.find({}).sort({ 'createdAt': -1 }).exec((err, recipes) => {
      if (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching recent recipes.');
      } else {
        // Render only the recipe list part of the page
        res.render('partials/recipe-list', { recipes: recipes });
      }
    });
  });
  
  

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

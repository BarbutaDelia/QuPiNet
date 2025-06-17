const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
const port = 6789;
app.set('view engine', 'ejs');

app.use(expressLayouts);
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/simulation', (req, res) => {
    res.render('simulation');
});

app.get('/chat', (req, res) => {
    res.render('chat');
});
app.listen(port, () => console.log(`Server is running at http://localhost:${port}/`));
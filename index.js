var express = require('express')
	, app = express()
	, bodyParser = require('body-parser')
	, morgan = require('morgan')
	, amazon = require('amazon-product-api');

// set up amazon client
var client = amazon.createClient({
  awsId: "AKIAIP4XCZQBNGNC2ECQ",
  awsSecret: "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",
  awsTag: "benjp51-20"
});

var styles = require('./keywords.json');

// configure app
app.use(morgan('dev')); // log requests to the console

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// port!!
var port = process.env.PORT || 8080;

// api routes

// create our router
var router = express.Router();

// middleware to use for all requests
router.use(function(req, res, next) {
	console.log('Something is happening.');
	next();
});



// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
	res.json({ message: 'api root, baby' });
});

router.route('/:gender/:style/:article') // &query=boots
	.get(function(req, res) {
		var gender = req.params.gender

		if(!styles.hasOwnProperty(req.params.style)) {
			res.redirect('/404')
		}

		if(req.params.article != "top" && req.params.article != "bottom") {
			res.redirect('/404')
		}

		var title = req.params.style
			, min = 0
			, max = 3
			, index = Math.floor(Math.random() * (max - min)) + min

		keyword = gender + " " + styles[title][req.params.article][index]
		
		client.itemSearch({
			Keywords: keyword,
			responseGroup: 'ItemAttributes'
		}, function(err, results, response) {
			if (err) {
				res.send(err);
			} else {
				res.send(results);
			}
		});
	});

// register routes
app.use('/api', router);

app.get('*', function(req, res){
  res.send({error: 'invalid route'}, 404);
});

// start theory
app.listen(port, function() {
	console.log('Magic happens on localhost:' + port);
});

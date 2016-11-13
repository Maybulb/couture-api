var express = require('express')
	, app = express()
	, bodyParser = require('body-parser')
	, morgan = require('morgan')
	, amazon = require('amazon-product-api')
	, request = require('request');

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
router.use(function(req, res, next) { next(); });


// test route!! localhost:8080/api)
router.get('/', function(req, res) {
	res.json({ message: 'api root, baby' });
});

router.route('/:gender/:style/:article') // article=[top/bottom]
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
				const base = results[0];
				var item = {
					"url": base["DetailPageURL"][0],
					"brand": base["ItemAttributes"][0]["Brand"][0],
					"color": base["ItemAttributes"][0]["Color"][0],
					"department": base["ItemAttributes"][0]["Department"][0],
					"note": base["ItemAttributes"][0]["Feature"], // amazon's writeup of the product
					"cost": {
						"formatted": base["ItemAttributes"][0]["ListPrice"][0]["FormattedPrice"][0] + " " + base["ItemAttributes"][0]["ListPrice"][0]["CurrencyCode"][0],
						"raw": {
							"amount": base["ItemAttributes"][0]["ListPrice"][0]["Amount"][0],
							"currency": base["ItemAttributes"][0]["ListPrice"][0]["CurrencyCode"][0]
						}
					},
					"group": base["ItemAttributes"][0]["ProductGroup"][0],
					"title": base["ItemAttributes"][0]["Title"][0]
				}
				res.send(item);
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

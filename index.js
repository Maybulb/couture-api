var express = require('express')
	, app = express()
	, bodyParser = require('body-parser')
	, morgan = require('morgan')
	, amazon = require('amazon-product-api')
	, cheerio = require('cheerio')
	, request = require('sync-request');

// set up amazon client
var client = amazon.createClient({
  awsId: "AKIAIP4XCZQBNGNC2ECQ",
  awsSecret: "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",
  awsTag: "benjp51-20"
});

var styles = require('./keywords.json');

var rand = require('rand-paul');

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

router.route('/:gender/:style').get(function(req, res) {
	var gender = (function () {
		switch (req.params.gender) {
			case "male":
				return "men's"
				break;
			case "female":
				return "women's"
				break;
			case "other":
				return ""
				break;
		}
	})();

	var priceRange = (function () {
		if (req.query["p"] != undefined) {
			var max = Number.parseInt(req.query['p']);
			return {
				"top": [max * .2, max * .4],
				"bottom": [max * .4, max * .6]
			}
		} else {
			return {
				"top": "",
				"bottom": ""
			}
		}
	})();

	if(!styles.hasOwnProperty(req.params.style)) {
		res.redirect('/404')
	}

	var title = req.params.style
		, min = 0
		, max = 3
		, index = Math.floor(Math.random() * (max - min)) + min

	global.item = new Object();
	global.done = new Object();
	getItem("top", gender, priceRange, title, index);
	getItem("bottom", gender, priceRange, title, index);

	// very, very, very dirty hack. fix later
	var checkIfDone = setInterval(function () {
		if (global.done["top"] && global.done["bottom"]) {
			clearInterval(checkIfDone);
			var punctuation = /[$.]/g
			global.item["totalCost"] = new Object();
			global.item["totalCost"]["raw"] = global.item["top"]["cost"]["raw"] + global.item["bottom"]["cost"]["raw"];
			// fix this later
			// global.item["totalCost"]["pretty"] = "$" + String(parseInt(global.item["top"]["cost"]["pretty"].split(punctuation)[1], 10) + parseInt(global.item["bottom"]["cost"]["pretty"].split(punctuation)[1], 10)) + "." + String(parseInt(global.item["top"]["cost"]["pretty"].split(punctuation)[2], 10) + parseInt(global.item["top"]["cost"]["pretty"].split(punctuation)[2], 10));
			res.send(global.item);
		}
	}, 200);
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

function getItem(article, gender, priceRange, title, index) {
	var keyword = gender + " " + styles[title][article][index];
	console.log(keyword)
	client.itemSearch({
		condition: "New",
		keywords: keyword,
		ResponseGroup: 'ItemAttributes',
		SearchIndex: 'Fashion',
		MaximumPrice: parseInt(String(Math.floor(priceRange[article][1] + "00"), 10)),
		MinimumPrice: parseInt(String(Math.floor(priceRange[article][0] + "00"), 10)),
		sort: "popularity-rank"
	}).then(function(results) {
		var base = rand.paul(results);
		var scrapeRes = request("GET", base["DetailPageURL"][0])
		var body = scrapeRes.getBody()
		var page = cheerio.load(body);

		global.item[article] = {
			"url": base["DetailPageURL"][0],
			"brand": base["ItemAttributes"][0]["Brand"][0],
			"color": base["ItemAttributes"][0]["Color"][0],
			"department": base["ItemAttributes"][0]["Department"][0],
			"note": base["ItemAttributes"][0]["Feature"], // amazon's writeup of the product
			"group": base["ItemAttributes"][0]["ProductGroup"][0],
			"title": base["ItemAttributes"][0]["Title"][0]
		}

		global.item[article]["image"] = page('img#landingImage, img.a-dynamic-image').attr("src");
		global.item[article]["cost"] = new Object();
		global.item[article]["cost"].pretty = page('#priceblock_ourprice, #priceblock_saleprice').text();
		global.item[article]["cost"].raw = Number.parseInt(global.item[article]["cost"].pretty.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""), 10);

		global.done[article] = true
	}).catch(function(err) {
		res.send(err);
	});
}
